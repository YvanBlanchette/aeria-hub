"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { validateAvatarFile, saveAvatarFile, deleteAvatarFile } from "@/lib/avatars";

function refreshSessionViews() {
  // Topbar/sidebar read the session in the shared (admin) layout, so a
  // plain revalidatePath("/settings") wouldn't refresh them.
  revalidatePath("/", "layout");
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateProfile(prevState, formData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name) return "Name is required.";
  if (!email) return "Email is required.";

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== user.id) {
    return "Another account already uses that email.";
  }

  await prisma.user.update({ where: { id: user.id }, data: { name, email } });

  await logActivity({
    entityType: "User",
    entityId: user.id,
    action: "updated",
    description: "Profile updated",
    userId: user.id,
  });

  refreshSessionViews();
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function uploadAvatar(prevState, formData) {
  const user = await requireUser();
  const file = formData.get("file");

  const validationError = validateAvatarFile(file);
  if (validationError) return validationError;

  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  const avatarUrl = await saveAvatarFile(user.id, file);
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
  if (previous?.avatarUrl) await deleteAvatarFile(previous.avatarUrl);

  refreshSessionViews();
}

export async function removeAvatar() {
  const user = await requireUser();
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  if (previous?.avatarUrl) await deleteAvatarFile(previous.avatarUrl);
  refreshSessionViews();
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function changePassword(prevState, formData) {
  const sessionUser = await requireUser();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) return "New password must be at least 8 characters.";
  if (newPassword !== confirmPassword) return "New password and confirmation don't match.";

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { passwordHash: true } });
  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) return "Current password is incorrect.";

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: sessionUser.id }, data: { passwordHash } });

  await logActivity({
    entityType: "User",
    entityId: sessionUser.id,
    action: "updated",
    description: "Password changed",
    userId: sessionUser.id,
  });
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function inviteAgent(prevState, formData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "AGENT";
  const password = String(formData.get("password") || "");

  if (!name) return "Name is required.";
  if (!email) return "Email is required.";
  if (password.length < 8) return "Temporary password must be at least 8 characters.";

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return "Another account already uses that email.";

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({ data: { name, email, role, passwordHash } });

  await logActivity({
    entityType: "User",
    entityId: created.id,
    action: "created",
    description: `Teammate ${name} added (${role.toLowerCase()})`,
    userId: admin.id,
  });

  revalidatePath("/settings");
}

/**
 * @param {string} userId
 * @param {"ADMIN" | "AGENT"} role
 */
export async function updateUserRole(userId, role) {
  await requireAdmin();
  if (role !== "ADMIN" && role !== "AGENT") return "Invalid role.";

  if (role === "AGENT") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === "ADMIN" && adminCount <= 1) {
      return "Can't remove the last admin.";
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
}

/**
 * @param {string} userId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function resetUserPassword(userId, prevState, formData) {
  await requireAdmin();
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) return "New password must be at least 8 characters.";
  if (newPassword !== confirmPassword) return "New password and confirmation don't match.";

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/settings");
}

/** @param {string} userId */
export async function removeUser(userId) {
  const admin = await requireAdmin();
  if (userId === admin.id) return "You can't remove your own account.";

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
  if (!target) return "Teammate not found.";

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return "Can't remove the last admin.";
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return `Can't remove ${target.name} — they still have notes, tasks, or clients assigned to them. Reassign those first.`;
  }

  revalidatePath("/settings");
}
