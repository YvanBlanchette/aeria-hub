"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { CopyableText } from "@/components/clients/copyable-text";
import { LoyaltyProgramFormDialog } from "@/components/clients/loyalty-program-form-dialog";
import { DeleteLoyaltyProgramButton } from "@/components/clients/delete-loyalty-program-button";

const COLUMNS = [
  { key: "programName", label: "Program" },
  { key: "memberNumber", label: "Member number" },
  { key: "notes", label: "Notes" },
];

export function LoyaltyProgramsTable({ loyaltyPrograms, clientId }) {
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(loyaltyPrograms, COLUMNS);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
          ))}
          <TableHead className="w-20 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((program) => (
          <TableRow key={program.id}>
            <TableCell className="font-medium">
              <CopyableText value={program.programName} label="program name" />
            </TableCell>
            <TableCell>
              <CopyableText value={program.memberNumber} label="member number" />
            </TableCell>
            <TableCell className="text-muted-foreground">{program.notes || "—"}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <LoyaltyProgramFormDialog
                  clientId={clientId}
                  program={program}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit {program.programName}</span>
                    </Button>
                  }
                />
                <DeleteLoyaltyProgramButton
                  loyaltyProgramId={program.id}
                  clientId={clientId}
                  programName={program.programName}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
