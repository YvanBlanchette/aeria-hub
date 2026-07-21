"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function compareValues(a, b, kind) {
  if (kind === "date") {
    const av = a ? new Date(a).getTime() : -Infinity;
    const bv = b ? new Date(b).getTime() : -Infinity;
    return av - bv;
  }
  if (kind === "number") return (a ?? 0) - (b ?? 0);
  return String(a ?? "").localeCompare(String(b ?? ""));
}

const STATUS_LABEL = { RECEIVED: "Received", PARTIAL: "Partial", PENDING: "Pending" };

export function CommissionsTable({ rows }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState("bookingDate");
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey], col?.kind);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
              <TableHead
                key={col.key}
                className={cn("cursor-pointer select-none", col.align === "right" && "text-right")}
                onClick={() => toggleSort(col.key)}
              >
                <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30" />
                  )}
                </span>
              </TableHead>
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
