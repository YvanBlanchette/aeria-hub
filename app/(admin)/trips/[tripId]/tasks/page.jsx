import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskFormDialog } from "@/components/trips/task-form-dialog";
import { TaskRow } from "@/components/trips/task-row";

export default async function TripTasksPage({ params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) notFound();

  const [tasks, agents] = await Promise.all([
    prisma.tripTask.findMany({
      where: { tripId },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
      include: { assignee: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <TaskFormDialog tripId={tripId} agents={agents} />
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet. Add things like "book flights" or "send visa documents".
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} tripId={tripId} />
          ))}
        </div>
      )}
    </div>
  );
}
