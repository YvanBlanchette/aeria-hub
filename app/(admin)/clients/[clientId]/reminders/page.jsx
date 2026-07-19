import { prisma } from "@/lib/prisma";
import { ReminderFormDialog } from "@/components/clients/reminder-form-dialog";
import { ReminderRow } from "@/components/clients/reminder-row";

export default async function RemindersPage({ params }) {
  const { clientId } = await params;

  const reminders = await prisma.reminder.findMany({
    where: { clientId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reminders</h2>
        <ReminderFormDialog clientId={clientId} />
      </div>

      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders set.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}
