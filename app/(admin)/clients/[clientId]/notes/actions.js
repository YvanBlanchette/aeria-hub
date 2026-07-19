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
export async function createNote(clientId, prevState, formData) {
  const user = await requireUser();
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) {
    return "Note cannot be empty.";
  }

  await prisma.note.create({
    data: { clientId, authorId: user.id, body: body.trim() },
  });

  await logActivity({
    entityType: "Note",
    entityId: clientId,
    action: "created",
    description: "Note added",
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/notes`);
}

/**
 * @param {string} noteId
 * @param {string} clientId
 */
export async function deleteNote(noteId, clientId) {
  await requireUser();
  const note = await prisma.note.findFirst({ where: { id: noteId, clientId } });
  if (!note) return;
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath(`/clients/${clientId}/notes`);
}
