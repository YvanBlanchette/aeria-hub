#!/usr/bin/env python3
"""
Migrate data from a Prisma SQLite database to PostgreSQL.

Features:
- Dry-run mode (no writes)
- Optional TRUNCATE before import
- FK-aware table ordering (parents first)
- Batch inserts
- Table-by-table row count verification

Usage examples:
  py scripts/migrate_sqlite_to_postgres.py \
    --sqlite-path ./prisma/dev.db \
    --pg-url "postgresql://user:pass@localhost:5432/aeria_hub?schema=public" \
    --dry-run

  py scripts/migrate_sqlite_to_postgres.py \
    --sqlite-path ./prisma/dev.db \
    --pg-url "postgresql://user:pass@localhost:5432/aeria_hub?schema=public" \
    --truncate
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import psycopg
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: psycopg. Install with: pip install psycopg[binary]"
    ) from exc


@dataclass
class PgColumn:
    name: str
    data_type: str


def quote_ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sqlite_tables(conn: sqlite3.Connection) -> list[str]:
    q = """
    SELECT name
    FROM sqlite_master
    WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_prisma_%'
    ORDER BY name
    """
    rows = conn.execute(q).fetchall()
    return [r[0] for r in rows]


def sqlite_table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    rows = conn.execute(f"PRAGMA table_info({quote_ident(table)})").fetchall()
    return [r[1] for r in rows]


def sqlite_fk_edges(conn: sqlite3.Connection, table: str) -> set[str]:
    """Return parent table names referenced by this table."""
    rows = conn.execute(f"PRAGMA foreign_key_list({quote_ident(table)})").fetchall()
    parents = {r[2] for r in rows if r[2]}
    return parents


def topological_table_order(conn: sqlite3.Connection, tables: list[str]) -> list[str]:
    graph: dict[str, set[str]] = {t: set() for t in tables}
    indegree: dict[str, int] = {t: 0 for t in tables}

    # Edge parent -> child
    for child in tables:
        parents = sqlite_fk_edges(conn, child)
        for parent in parents:
            if parent in graph and child in graph and child not in graph[parent]:
                graph[parent].add(child)
                indegree[child] += 1

    queue = deque(sorted([t for t in tables if indegree[t] == 0]))
    order: list[str] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in sorted(graph[node]):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    # Cycle safety: append leftovers in deterministic order.
    if len(order) < len(tables):
        leftovers = [t for t in tables if t not in set(order)]
        order.extend(sorted(leftovers))

    return order


def pg_columns(conn: psycopg.Connection, table: str, schema: str) -> list[PgColumn]:
    q = """
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = %s AND table_name = %s
    ORDER BY ordinal_position
    """
    rows = conn.execute(q, (schema, table)).fetchall()
    return [PgColumn(name=r[0], data_type=r[1]) for r in rows]


def sqlite_count(conn: sqlite3.Connection, table: str) -> int:
    return int(conn.execute(f"SELECT COUNT(*) FROM {quote_ident(table)}").fetchone()[0])


def pg_count(conn: psycopg.Connection, table: str, schema: str) -> int:
    q = f"SELECT COUNT(*) FROM {quote_ident(schema)}.{quote_ident(table)}"
    return int(conn.execute(q).fetchone()[0])


def sqlite_rows(conn: sqlite3.Connection, table: str, cols: list[str], batch_size: int):
    col_sql = ", ".join(quote_ident(c) for c in cols)
    cursor = conn.execute(f"SELECT {col_sql} FROM {quote_ident(table)}")
    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break
        yield rows


def normalize_value(value: Any, pg_type: str) -> Any:
    if value is None:
        return None

    if pg_type == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            v = value.strip().lower()
            if v in {"1", "t", "true", "yes", "y"}:
                return True
            if v in {"0", "f", "false", "no", "n"}:
                return False
        return bool(value)

    if pg_type in {"json", "jsonb"}:
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        if isinstance(value, str):
            s = value.strip()
            if s == "":
                return None
            # Keep raw JSON text for PostgreSQL cast.
            return s
        return json.dumps(value)

    return value


def truncate_tables(conn: psycopg.Connection, schema: str, ordered_tables: list[str]) -> None:
    if not ordered_tables:
        return
    fq = [f"{quote_ident(schema)}.{quote_ident(t)}" for t in reversed(ordered_tables)]
    sql = f"TRUNCATE TABLE {', '.join(fq)} RESTART IDENTITY CASCADE"
    conn.execute(sql)


def import_table(
    sqlite_conn: sqlite3.Connection,
    pg_conn: psycopg.Connection,
    table: str,
    schema: str,
    batch_size: int,
    dry_run: bool,
) -> tuple[int, int, int]:
    src_cols = sqlite_table_columns(sqlite_conn, table)
    dst_cols = pg_columns(pg_conn, table, schema)

    if not dst_cols:
        # Table not found on target schema
        src = sqlite_count(sqlite_conn, table)
        return src, 0, 0

    dst_col_map = {c.name: c for c in dst_cols}
    common_cols = [c for c in src_cols if c in dst_col_map]

    src_count = sqlite_count(sqlite_conn, table)
    if src_count == 0 or not common_cols:
        return src_count, 0, pg_count(pg_conn, table, schema)

    inserted = 0

    col_sql = ", ".join(quote_ident(c) for c in common_cols)
    placeholders = ", ".join(["%s"] * len(common_cols))
    target = f"{quote_ident(schema)}.{quote_ident(table)}"
    insert_sql = f"INSERT INTO {target} ({col_sql}) VALUES ({placeholders})"

    if not dry_run:
        for batch in sqlite_rows(sqlite_conn, table, common_cols, batch_size):
            normalized_batch = []
            for row in batch:
                vals = []
                for i, col in enumerate(common_cols):
                    pg_type = dst_col_map[col].data_type
                    vals.append(normalize_value(row[i], pg_type))
                normalized_batch.append(tuple(vals))
            pg_conn.executemany(insert_sql, normalized_batch)
            inserted += len(normalized_batch)

    dst_count = pg_count(pg_conn, table, schema)
    return src_count, inserted, dst_count


def parse_schema_from_url(pg_url: str) -> str:
    # Prisma commonly uses ?schema=public
    marker = "schema="
    idx = pg_url.find(marker)
    if idx == -1:
        return "public"
    raw = pg_url[idx + len(marker):]
    end = raw.find("&")
    return raw if end == -1 else raw[:end]


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate Prisma SQLite data to PostgreSQL")
    parser.add_argument("--sqlite-path", required=True, help="Path to SQLite DB file")
    parser.add_argument("--pg-url", required=True, help="PostgreSQL connection URL")
    parser.add_argument("--schema", default=None, help="Target PostgreSQL schema (default from URL or public)")
    parser.add_argument("--batch-size", type=int, default=500, help="Rows per batch")
    parser.add_argument("--truncate", action="store_true", help="Truncate target tables before import")
    parser.add_argument("--dry-run", action="store_true", help="Plan only, no writes")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite DB not found: {sqlite_path}")

    schema = args.schema or parse_schema_from_url(args.pg_url)

    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_conn.execute("PRAGMA foreign_keys=ON")

    pg_conn = psycopg.connect(args.pg_url)
    pg_conn.autocommit = False

    try:
        tables = sqlite_tables(sqlite_conn)
        ordered = topological_table_order(sqlite_conn, tables)

        print(f"Source tables: {len(tables)}")
        print(f"Target schema: {schema}")
        print("Order:")
        for t in ordered:
            print(f"- {t}")

        if args.dry_run:
            print("\nDRY RUN: no writes will be performed.\n")
        else:
            if args.truncate:
                truncate_tables(pg_conn, schema, ordered)
                print("Target tables truncated.")

        total_src = 0
        total_inserted = 0
        results = []

        for table in ordered:
            src_count, inserted, dst_count = import_table(
                sqlite_conn=sqlite_conn,
                pg_conn=pg_conn,
                table=table,
                schema=schema,
                batch_size=args.batch_size,
                dry_run=args.dry_run,
            )
            total_src += src_count
            total_inserted += inserted
            results.append((table, src_count, inserted, dst_count))
            print(
                f"{table}: src={src_count} inserted={inserted} target_after={dst_count}"
            )

        if args.dry_run:
            pg_conn.rollback()
            print("\nDry run complete. Transaction rolled back.")
        else:
            pg_conn.commit()
            print("\nMigration committed.")

        print("\nSummary")
        print(f"- source rows total: {total_src}")
        print(f"- inserted rows total: {total_inserted}")

        mismatches = [r for r in results if r[1] > 0 and not args.dry_run and r[3] < r[1]]
        if mismatches:
            print("- warning: some target counts are lower than source counts")
            for t, src, _, dst in mismatches:
                print(f"  {t}: src={src} target_after={dst}")

    finally:
        try:
            pg_conn.close()
        finally:
            sqlite_conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
