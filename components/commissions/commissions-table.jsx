"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "tripName", label: "Trip" },
  { key: "clientName", label: "Client" },
  { key: "totalAmount", label: "Amount", align: "right", kind: "number" },
  { key: "paymentDate", label: "Payment date", align: "right", kind: "date" },
  { key: "bookingDate", label: "Booking date", align: "right", kind: "date" },
  { key: "status", label: "Status", align: "right" },
];

const STATUS_LABEL = { RECEIVED: "Received", PARTIAL: "Partial", PENDING: "Pending" };

export function CommissionsTable({ rows }) {
  const router = useRouter();
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS, { defaultKey: "bookingDate" });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No commissions set yet. Add one from a segment on a trip's Itinerary tab.
      </p>
    );
  }

  const now = new Date();

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
          {sorted.map((row) => {
            const overdue = row.status !== "RECEIVED" && row.paymentDate && new Date(row.paymentDate) < now;
            return (
              <TableRow
                key={row.tripId}
                className="cursor-pointer bg-card hover:bg-muted/40"
                onClick={() => router.push(`/trips/${row.tripId}/commissions`)}
              >
                <TableCell className="font-medium">{row.tripName}</TableCell>
                <TableCell>{row.clientName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.totalAmount)}</TableCell>
                <TableCell className={cn("text-right", overdue && "text-destructive")}>
                  {row.paymentDate ? formatDate(row.paymentDate) : "—"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{formatDate(row.bookingDate)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      row.status === "RECEIVED" ? "default" : row.status === "PARTIAL" ? "outline" : overdue ? "destructive" : "secondary"
                    }
                  >
                    {STATUS_LABEL[row.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
