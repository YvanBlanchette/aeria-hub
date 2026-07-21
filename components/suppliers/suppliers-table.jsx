"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { SUPPLIER_CATEGORY_MAP } from "@/lib/suppliers";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "categoryLabel", label: "Category" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "agentPortalUrl", label: "Agent portal" },
];

export function SuppliersTable({ suppliers }) {
  const router = useRouter();
  const rows = suppliers.map((s) => ({
    ...s,
    categoryLabel: SUPPLIER_CATEGORY_MAP[s.category]?.label || s.category,
  }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS, { defaultKey: "name" });

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No suppliers yet. Add one to get started.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((supplier) => {
            const meta = SUPPLIER_CATEGORY_MAP[supplier.category];
            const Icon = meta?.icon;
            return (
              <TableRow
                key={supplier.id}
                className="cursor-pointer bg-card hover:bg-muted/40"
                onClick={() => router.push(`/suppliers/${supplier.id}`)}
              >
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1.5">
                    {Icon && <Icon className="size-3.5" />}
                    {supplier.categoryLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {supplier.website ? (
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Visit <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {supplier.agentPortalUrl ? (
                    <a
                      href={supplier.agentPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Visit <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
