import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

// Avatars are served directly via <img src> everywhere in the UI (topbar,
// task assignees...), so unlike client documents they live under public/
// instead of the private storage/uploads tree.
const AVATAR_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "avatars");
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Returns an error message if the file fails validation, or null if it's fine. */
export function validateAvatarFile(file) {
  if (!(file instanceof File) || file.size === 0) {
    return "Please choose an image to upload.";
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return "Image is too large. Maximum size is 5MB.";
  }
  if (!ALLOWED_MIME_TYPES[file.type]) {
    return "Unsupported image type. Please upload a JPEG, PNG, or WebP.";
  }
  return null;
}

/**
 * Writes a validated avatar image to public storage and returns its public URL.
 * @param {string} userId
 * @param {File} file
 */
export async function saveAvatarFile(userId, file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(AVATAR_UPLOAD_ROOT, { recursive: true });
  const ext = ALLOWED_MIME_TYPES[file.type];
  const fileName = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(AVATAR_UPLOAD_ROOT, fileName), bytes);
  return `/uploads/avatars/${fileName}`;
}

/** Best-effort delete of a previously-stored avatar — swallows errors (e.g. already gone). */
export async function deleteAvatarFile(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) return;
  const fileName = path.basename(avatarUrl);
  await unlink(path.join(AVATAR_UPLOAD_ROOT, fileName)).catch(() => {});
}
