"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { formatCurrency, initials } from "@/lib/format";

const COLUMNS = [
  { key: "fullName", label: "Name" },
  { key: "primaryEmail", label: "Email" },
  { key: "primaryPhone", label: "Phone" },
  { key: "activeBookings", label: "Active bookings", align: "right", kind: "number" },
  { key: "totalSpent", label: "Total spent", align: "right", kind: "number" },
  { key: "status", label: "Status", align: "right" },
];

export function ClientsTable({ clients, spentByClient }) {
  const rows = clients.map((c) => ({
    ...c,
    fullName: `${c.firstName} ${c.lastName}`,
    activeBookings: c._count.trips,
    totalSpent: spentByClient[c.id] || 0,
  }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

  if (rows.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="py-10 text-center text-sm text-muted-foreground">No clients found.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
          ))}
          <TableHead className="w-10 text-center" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((client) => (
          <TableRow key={client.id} className="bg-card">
            <TableCell>
              <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs">{initials(client.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{client.fullName}</p>
                </div>
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{client.primaryEmail || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{client.primaryPhone || "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{client.activeBookings}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(client.totalSpent)}</TableCell>
            <TableCell className="text-center w-32">
              <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] capitalize">
                {client.status.toLowerCase()}
              </Badge>
            </TableCell>
            <TableCell>
              <DeleteClientButton clientId={client.id} clientName={client.fullName} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
