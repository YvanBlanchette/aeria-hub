"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createReminder(clientId, prevState, formData) {
  const user = await requireUser();
  const title = formData.get("title");
  const dueDate = formData.get("dueDate");
  const type = formData.get("type") || "CUSTOM";

  if (typeof title !== "string" || !title.trim()) {
    return "Title is required.";
  }
  if (typeof dueDate !== "string" || !dueDate) {
    return "Due date is required.";
  }

  await prisma.reminder.create({
    data: { clientId, title: title.trim(), dueDate: new Date(dueDate), type },
  });

  await logActivity({
    entityType: "Reminder",
    entityId: clientId,
    action: "created",
    description: `Reminder "${title.trim()}" added`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/reminders`);
}

/**
 * @param {string} reminderId
 * @param {string} clientId
 * @param {boolean} completed
 */
export async function toggleReminder(reminderId, clientId, completed) {
  await requireUser();
  await prisma.reminder.update({ where: { id: reminderId }, data: { completed } });
  revalidatePath(`/clients/${clientId}/reminders`);
}

/**
 * @param {string} reminderId
 * @param {string} clientId
 */
export async function deleteReminder(reminderId, clientId) {
  await requireUser();
  await prisma.reminder.delete({ where: { id: reminderId } });
  revalidatePath(`/clients/${clientId}/reminders`);
}
