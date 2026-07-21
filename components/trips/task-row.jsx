"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { toggleTask, deleteTask } from "@/app/(admin)/trips/[tripId]/tasks/actions";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TaskRow({ task, tripId }) {
  const [isPending, startTransition] = useTransition();
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Checkbox
        checked={task.completed}
        disabled={isPending}
        onCheckedChange={(checked) => startTransition(() => toggleTask(task.id, tripId, Boolean(checked)))}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", task.completed && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className={cn("text-xs text-muted-foreground", isOverdue && "text-destructive")}>
            Due {formatDate(task.dueDate)}
            {isOverdue ? " · Overdue" : ""}
          </p>
        )}
      </div>
      {task.assignee && (
        <Avatar className="size-7" title={task.assignee.name}>
          {task.assignee.avatarUrl && <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.name} />}
          <AvatarFallback className="bg-secondary text-xs">{initials(task.assignee.name)}</AvatarFallback>
        </Avatar>
      )}
      <ConfirmDeleteButton itemLabel={task.title} onConfirm={() => deleteTask(task.id, tripId)} />
    </div>
  );
}
