"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createTask(tripId, prevState, formData) {
  const user = await requireUser();
  const title = formData.get("title");
  const dueDate = formData.get("dueDate");
  const assigneeId = formData.get("assigneeId");

  if (typeof title !== "string" || !title.trim()) {
    return "Title is required.";
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
  if (!trip) return "Trip not found.";

  await prisma.tripTask.create({
    data: {
      tripId,
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId && assigneeId !== "unassigned" ? assigneeId : null,
    },
  });

  await logActivity({
    entityType: "TripTask",
    entityId: tripId,
    action: "created",
    description: `Task "${title.trim()}" added to "${trip.name}"`,
    userId: user.id,
    clientId: trip.clientId,
  });

  revalidatePath(`/trips/${tripId}/tasks`);
}

/**
 * @param {string} taskId
 * @param {string} tripId
 * @param {boolean} completed
 */
export async function toggleTask(taskId, tripId, completed) {
  await requireUser();
  const task = await prisma.tripTask.findFirst({ where: { id: taskId, tripId } });
  if (!task) return;
  await prisma.tripTask.update({ where: { id: taskId }, data: { completed } });
  revalidatePath(`/trips/${tripId}/tasks`);
}

/**
 * @param {string} taskId
 * @param {string} tripId
 */
export async function deleteTask(taskId, tripId) {
  await requireUser();
  const task = await prisma.tripTask.findFirst({ where: { id: taskId, tripId } });
  if (!task) return;
  await prisma.tripTask.delete({ where: { id: taskId } });
  revalidatePath(`/trips/${tripId}/tasks`);
}
