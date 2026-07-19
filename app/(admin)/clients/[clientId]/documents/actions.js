"use server";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

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

  if (!(file instanceof File) || file.size === 0) {
    return "Please choose a file to upload.";
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", clientId);
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), bytes);

  await prisma.document.create({
    data: {
      clientId,
      travelerId: travelerId && travelerId !== "none" ? travelerId : null,
      type,
      fileName: file.name,
      fileUrl: `/uploads/${clientId}/${safeName}`,
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
  const document = await prisma.document.delete({ where: { id: documentId } });

  if (document.fileUrl.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", document.fileUrl)).catch(() => {});
  }

  revalidatePath(`/clients/${clientId}/documents`);
}
