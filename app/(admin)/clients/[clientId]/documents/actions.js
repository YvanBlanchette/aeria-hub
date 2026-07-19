"use server";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

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
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10MB.";
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Unsupported file type. Please upload a JPEG, PNG, WebP, HEIC, or PDF.";
  }

  // Documents belong to this client — verify a claimed traveler is actually theirs.
  const travelerIdValue = travelerId && travelerId !== "none" ? travelerId : null;
  if (travelerIdValue) {
    const traveler = await prisma.traveler.findFirst({ where: { id: travelerIdValue, clientId } });
    if (!traveler) return "That traveler doesn't belong to this client.";
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(UPLOAD_ROOT, clientId);
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), bytes);

  await prisma.document.create({
    data: {
      clientId,
      travelerId: travelerIdValue,
      type,
      fileName: file.name,
      storagePath: `${clientId}/${safeName}`,
      mimeType: file.type,
      fileSize: file.size,
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
  await unlink(path.join(UPLOAD_ROOT, document.storagePath)).catch(() => {});

  revalidatePath(`/clients/${clientId}/documents`);
}
