"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { validateUploadedFile, saveUploadedFile, deleteStoredFile } from "@/lib/documents";

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function uploadDocument(clientId, prevState, formData) {
  const user = await requireUser();
  const file = formData.get("file");
  const type = formData.get("type") || "OTHER";
  const travelerId = formData.get("travelerId");
  const expiryDate = formData.get("expiryDate");

  const validationError = validateUploadedFile(file);
  if (validationError) return validationError;

  // Documents belong to this client — verify a claimed traveler is actually theirs.
  const travelerIdValue = travelerId && travelerId !== "none" ? travelerId : null;
  if (travelerIdValue) {
    const traveler = await prisma.traveler.findFirst({ where: { id: travelerIdValue, clientId } });
    if (!traveler) return "That traveler doesn't belong to this client.";
  }

  const saved = await saveUploadedFile(clientId, file);

  await prisma.document.create({
    data: {
      clientId,
      travelerId: travelerIdValue,
      type,
      ...saved,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  await logActivity({
    entityType: "Document",
    entityId: clientId,
    action: "created",
    description: `Document "${file.name}" uploaded`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/documents`);
}

/**
 * @param {string} documentId
 * @param {string} clientId
 */
export async function deleteDocument(documentId, clientId) {
  await requireUser();
  const document = await prisma.document.findFirst({ where: { id: documentId, clientId } });
  if (!document) return;

  await prisma.document.delete({ where: { id: documentId } });
  await deleteStoredFile(document.storagePath);

  revalidatePath(`/clients/${clientId}/documents`);
}
