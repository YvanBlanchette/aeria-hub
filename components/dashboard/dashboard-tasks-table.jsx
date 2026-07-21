"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { toggleTask } from "@/app/(admin)/trips/[tripId]/tasks/actions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "title", label: "Task" },
  { key: "tripName", label: "Trip" },
  { key: "dueDate", label: "Due", align: "right", kind: "date" },
];

function TaskCheckbox({ task }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Checkbox
      checked={task.completed}
      disabled={isPending}
      onCheckedChange={(checked) => startTransition(() => toggleTask(task.id, task.tripId, Boolean(checked)))}
    />
  );
}

export function DashboardTasksTable({ tasks }) {
  const rows = tasks.map((t) => ({ ...t, tripName: t.trip.name }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS, { defaultKey: "dueDate" });

  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No open tasks. Nice and clear.</p>;
  }

  const now = new Date();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          {COLUMNS.map((col) => (
            <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((task) => {
          const overdue = task.dueDate && new Date(task.dueDate) < now;
          return (
            <TableRow key={task.id} className="bg-card">
              <TableCell>
                <TaskCheckbox task={task} />
              </TableCell>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell className="text-muted-foreground">
                <Link href={`/trips/${task.tripId}/tasks`} className="hover:underline">
                  {task.tripName}
                </Link>
              </TableCell>
              <TableCell className={cn("text-right", overdue && "text-destructive")}>
                {task.dueDate ? formatDate(task.dueDate) : "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
