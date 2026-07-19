import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

/** Returns an error message if the file fails validation, or null if it's fine. */
export function validateUploadedFile(file) {
  if (!(file instanceof File) || file.size === 0) {
    return "Please choose a file to upload.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10MB.";
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Unsupported file type. Please upload a JPEG, PNG, WebP, HEIC, or PDF.";
  }
  return null;
}

/**
 * Writes a validated file to private storage under the given client's
 * folder and returns the fields needed to create a Document row.
 * @param {string} clientId
 * @param {File} file
 */
export async function saveUploadedFile(clientId, file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(UPLOAD_ROOT, clientId);
  await mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), bytes);

  return {
    fileName: file.name,
    storagePath: `${clientId}/${safeName}`,
    mimeType: file.type,
    fileSize: file.size,
  };
}

/** Best-effort delete of a stored file — swallows errors (e.g. already gone). */
export async function deleteStoredFile(storagePath) {
  await unlink(path.join(UPLOAD_ROOT, storagePath)).catch(() => {});
}
