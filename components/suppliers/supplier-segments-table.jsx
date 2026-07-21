"use client";

import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";

const COLUMNS = [
  { key: "title", label: "Segment" },
  { key: "typeLabel", label: "Type" },
  { key: "tripName", label: "Trip" },
  { key: "clientName", label: "Client" },
  { key: "startDateTime", label: "Date", kind: "date" },
  { key: "cost", label: "Cost", align: "right", kind: "number" },
];

export function SupplierSegmentsTable({ segments }) {
  const router = useRouter();
  const rows = segments.map((s) => ({
    ...s,
    typeLabel: SEGMENT_TYPE_MAP[s.type]?.label || s.type,
    tripName: s.trip.name,
    clientName: `${s.trip.client.firstName} ${s.trip.client.lastName}`,
  }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS, { defaultKey: "startDateTime" });

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No segments booked through this supplier yet.</p>;
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
          {sorted.map((segment) => (
            <TableRow
              key={segment.id}
              className="cursor-pointer bg-card hover:bg-muted/40"
              onClick={() => router.push(`/trips/${segment.trip.id}/itinerary`)}
            >
              <TableCell className="font-medium">{segment.title}</TableCell>
              <TableCell className="text-muted-foreground">{segment.typeLabel}</TableCell>
              <TableCell className="text-muted-foreground">{segment.tripName}</TableCell>
              <TableCell className="text-muted-foreground">{segment.clientName}</TableCell>
              <TableCell className="text-muted-foreground">
                {segment.startDateTime ? formatDate(segment.startDateTime) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {segment.cost != null ? formatCurrency(segment.cost) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
