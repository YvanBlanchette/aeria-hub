"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { toggleReminder, deleteReminder } from "@/app/(admin)/clients/[clientId]/reminders/actions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const typeLabels = {
  PASSPORT_EXPIRY: "Passport expiry",
  FINAL_PAYMENT: "Final payment",
  CUSTOM: "Custom",
};

export function ReminderRow({ reminder, clientId }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Checkbox
        checked={reminder.completed}
        disabled={isPending}
        onCheckedChange={(checked) =>
          startTransition(() => toggleReminder(reminder.id, clientId, Boolean(checked)))
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", reminder.completed && "text-muted-foreground line-through")}>
          {reminder.title}
        </p>
        <p className="text-xs text-muted-foreground">Due {formatDate(reminder.dueDate)}</p>
      </div>
      <Badge variant="secondary">{typeLabels[reminder.type] || reminder.type}</Badge>
      <ConfirmDeleteButton
        itemLabel="reminder"
        onConfirm={() => deleteReminder(reminder.id, clientId)}
      />
    </div>
  );
}
