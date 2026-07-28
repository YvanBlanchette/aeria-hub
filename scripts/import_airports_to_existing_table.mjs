#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function normalizeAirport(row) {
	const code = String(row?.code || "")
		.toUpperCase()
		.trim();
	const name = String(row?.name || "").trim();
	const city = String(row?.city || "").trim() || null;
	const country =
		String(row?.country || "")
			.toUpperCase()
			.trim() || null;
	const lat = Number.isFinite(row?.lat) ? Number(row.lat) : null;
	const lon = Number.isFinite(row?.lon) ? Number(row.lon) : null;

	if (code.length !== 3 || !name) return null;
	return { code, name, city, country, lat, lon };
}

async function readAirportsJson() {
	const filePath = path.resolve(process.cwd(), "data/airports.json");
	const raw = await readFile(filePath, "utf-8");
	const parsed = JSON.parse(raw);
	const rows = Array.isArray(parsed?.airports) ? parsed.airports : [];
	return rows.map(normalizeAirport).filter(Boolean);
}

async function loadTableColumns(client) {
	const result = await client.query(`
		SELECT table_schema, table_name, column_name
		FROM information_schema.columns
		WHERE lower(table_name) IN ('airports', 'airport')
		AND table_schema NOT IN ('pg_catalog', 'information_schema')
	`);

	if (result.rows.length === 0) {
		await client.query(`
			CREATE TABLE IF NOT EXISTS public.airports (
				code TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				city TEXT,
				country TEXT,
				lat DOUBLE PRECISION,
				lon DOUBLE PRECISION,
				created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		const retry = await client.query(`
			SELECT table_schema, table_name, column_name
			FROM information_schema.columns
			WHERE table_schema = 'public' AND lower(table_name) = 'airports'
		`);

		if (retry.rows.length === 0) {
			throw new Error("No table named 'airports' or 'airport' was found in this database.");
		}

		return {
			schema: "public",
			table: "airports",
			columns: new Set(retry.rows.map((r) => r.column_name)),
		};
	}

	const grouped = new Map();
	for (const row of result.rows) {
		const key = `${row.table_schema}.${row.table_name}`;
		if (!grouped.has(key)) {
			grouped.set(key, {
				schema: row.table_schema,
				table: row.table_name,
				columns: new Set(),
			});
		}
		grouped.get(key).columns.add(row.column_name);
	}

	const candidates = Array.from(grouped.values());
	const selected = candidates.find((item) => item.schema === "public") || candidates[0];

	return {
		schema: selected.schema,
		table: selected.table,
		columns: selected.columns,
	};
}

function resolveColumns(columnsSet) {
	const byLower = new Map(Array.from(columnsSet).map((col) => [String(col).toLowerCase(), col]));
	const pick = (...aliases) => {
		for (const alias of aliases) {
			const found = byLower.get(alias.toLowerCase());
			if (found) return found;
		}
		return null;
	};

	const codeCol = pick("code", "iata", "iata_code", "airport_code", "code_iata", "iataairport");
	const nameCol = pick("name", "airport", "airport_name", "full_name", "label", "nom", "nom_aeroport");
	const cityCol = pick("city", "ville", "city_name", "municipality", "commune");
	const countryCol = pick("country", "pays", "country_code", "iso_country", "country_iso");
	const latCol = pick("lat", "latitude", "y");
	const lonCol = pick("lon", "lng", "longitude", "x");

	if (!codeCol || !nameCol) {
		const list = Array.from(columnsSet)
			.sort((a, b) => String(a).localeCompare(String(b)))
			.join(", ");
		throw new Error(`Airports table is missing required columns. Resolved code=${codeCol || "none"}, name=${nameCol || "none"}. Available columns: [${list}]`);
	}

	return { codeCol, nameCol, cityCol, countryCol, latCol, lonCol };
}

function quoteIdent(value) {
	return `"${String(value).replace(/"/g, '""')}"`;
}

async function importAirports() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is missing.");
	}

	const airports = await readAirportsJson();
	if (airports.length === 0) {
		console.log("No valid airports found in data/airports.json.");
		return;
	}

	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();

	let inserted = 0;
	let updated = 0;

	try {
		const tableInfo = await loadTableColumns(client);
		const cols = resolveColumns(tableInfo.columns);
		const tableRef = `${quoteIdent(tableInfo.schema)}.${quoteIdent(tableInfo.table)}`;

		console.log(`Using table ${tableInfo.schema}.${tableInfo.table}`);
		console.log(
			`Resolved columns: code=${cols.codeCol}, name=${cols.nameCol}, city=${cols.cityCol || "none"}, country=${cols.countryCol || "none"}, lat=${cols.latCol || "none"}, lon=${cols.lonCol || "none"}`,
		);

		for (const airport of airports) {
			const payload = {};
			payload[cols.codeCol] = airport.code;
			payload[cols.nameCol] = airport.name;
			if (cols.cityCol) payload[cols.cityCol] = airport.city;
			if (cols.countryCol) payload[cols.countryCol] = airport.country;
			if (cols.latCol) payload[cols.latCol] = airport.lat;
			if (cols.lonCol) payload[cols.lonCol] = airport.lon;

			const fields = Object.keys(payload);
			const mutableFields = fields.filter((field) => field !== cols.codeCol);

			// Legacy-friendly strategy: update by code first, then insert if no row exists.
			if (mutableFields.length > 0) {
				const updateSet = mutableFields.map((field, i) => `\"${field}\" = $${i + 1}`).join(", ");
				const updateValues = mutableFields.map((field) => payload[field]);
				const updateCodeParam = `$${updateValues.length + 1}`;
				const updateSql = `
					UPDATE ${tableRef}
					SET ${updateSet}
					WHERE UPPER(TRIM(COALESCE(CAST(\"${cols.codeCol}\" AS TEXT), ''))) = ${updateCodeParam}
				`;

				const updateResult = await client.query(updateSql, [...updateValues, airport.code]);
				if (updateResult.rowCount > 0) {
					updated += updateResult.rowCount;
					continue;
				}
			}

			const insertValues = fields.map((field) => payload[field]);
			const insertPlaceholders = fields.map((_, i) => `$${i + 1}`).join(", ");
			const insertSql = `
				INSERT INTO ${tableRef} (${fields.map((f) => `\"${f}\"`).join(", ")})
				VALUES (${insertPlaceholders})
			`;

			await client.query(insertSql, insertValues);
			inserted += 1;
		}
	} finally {
		await client.end();
	}

	console.log(`Airports import complete. Inserted: ${inserted}, Updated: ${updated}, Total processed: ${airports.length}.`);
}

importAirports().catch((error) => {
	console.error("Airports import failed:", error.message || error);
	process.exit(1);
});
