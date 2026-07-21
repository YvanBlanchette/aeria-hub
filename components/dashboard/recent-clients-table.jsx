"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { CopyableText } from "@/components/clients/copyable-text";
import { initials } from "@/lib/format";

const COLUMNS = [
  { key: "fullName", label: "Name" },
  { key: "primaryEmail", label: "Email" },
  { key: "primaryPhone", label: "Phone" },
  { key: "status", label: "Status" },
];

export function RecentClientsTable({ clients }) {
  const rows = clients.map((c) => ({ ...c, fullName: `${c.firstName} ${c.lastName}` }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

  if (rows.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow className="bg-card">
            <TableCell className="py-10 text-center text-sm text-muted-foreground">No clients yet.</TableCell>
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
            <TableCell className="text-muted-foreground">
              <CopyableText value={client.primaryEmail} label="email" />
            </TableCell>
            <TableCell className="text-muted-foreground">
              <CopyableText value={client.primaryPhone} label="phone" />
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] capitalize">
                {client.status.toLowerCase()}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
