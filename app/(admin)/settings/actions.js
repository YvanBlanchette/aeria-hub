"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { validateAvatarFile, saveAvatarFile, deleteAvatarFile } from "@/lib/avatars";
import { tServer } from "@/lib/i18n-server";
import { getClientPortalRecord } from "@/lib/client-portal";
import { parseTripCsv } from "@/lib/trips-csv";
import { dollarsToCents } from "@/lib/format";

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
	const t = tServer;
	const user = await requireUser();
	const name = String(formData.get("name") || "").trim();
	const email = String(formData.get("email") || "").trim();

	if (!name) return t("errors.requiredName", "Name is required.");
	if (!email) return t("errors.requiredEmail", "Email is required.");

	const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
	if (existing && existing.id !== user.id) {
		return t("errors.emailInUse", "Another account already uses that email.");
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
export async function requestClientProfileUpdate(prevState, formData) {
	const user = await requireUser();
	if (user.role !== "CLIENT") return tServer("errors.clientOnlyAction", "This action is only available in the client portal.");

	const portal = await getClientPortalRecord(user);
	if (!portal?.client) return tServer("errors.clientNotFound", "Client not found.");

	const client = portal.client;
	const fieldLabels = {
		firstName: "First name",
		lastName: "Last name",
		primaryEmail: "Primary email",
		secondaryEmail: "Secondary email",
		primaryPhone: "Primary phone",
		secondaryPhone: "Secondary phone",
		address: "Address",
		city: "City",
		stateProvince: "Province / State",
		postalCode: "Postal code",
		country: "Country",
		dateOfBirth: "Date of birth",
		passportNumber: "Passport number",
		passportIssueDate: "Passport issue date",
		passportExpiry: "Passport expiry date",
		redressNumber: "Redress number",
		knownTravelerNumber: "Known traveler number",
		nationality: "Nationality",
		travelPreferences: "Travel preferences",
		dietaryNotes: "Dietary / medical notes",
		mobilityNotes: "Mobility notes",
	};

	const changes = Object.entries(fieldLabels)
		.map(([key, label]) => {
			const proposed = String(formData.get(key) || "").trim();
			const currentValue = client[key] instanceof Date ? client[key].toISOString().slice(0, 10) : String(client[key] || "").trim();
			if (proposed === currentValue) return null;
			return `${label}: "${currentValue || "-"}" -> "${proposed || "-"}"`;
		})
		.filter(Boolean);

	if (changes.length === 0) return tServer("settings.profile.noChanges", "No profile changes to submit.");

	await prisma.inquiry.create({
		data: {
			name: `${client.firstName} ${client.lastName}`.trim(),
			email: user.email || client.primaryEmail,
			phone: client.primaryPhone,
			source: "client_profile_update",
			status: "NEW",
			notes: [`Client profile update request`, "", ...changes].join("\n"),
			assignedAgentId: client.assignedAgentId,
			convertedClientId: client.id,
		},
	});

	revalidatePath("/settings");
	revalidatePath("/inquiries");
	return { ok: true };
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function changePassword(prevState, formData) {
	const t = tServer;
	const sessionUser = await requireUser();
	const currentPassword = String(formData.get("currentPassword") || "");
	const newPassword = String(formData.get("newPassword") || "");
	const confirmPassword = String(formData.get("confirmPassword") || "");

	if (newPassword.length < 8) return t("errors.newPasswordMin", "New password must be at least 8 characters.");
	if (newPassword !== confirmPassword) return t("errors.passwordConfirmMismatch", "New password and confirmation don't match.");

	const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { passwordHash: true } });
	const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
	if (!currentMatches) return t("errors.currentPasswordIncorrect", "Current password is incorrect.");

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
	const t = tServer;
	const admin = await requireAdmin();
	const name = String(formData.get("name") || "").trim();
	const email = String(formData.get("email") || "").trim();
	const role = formData.get("role") === "ADMIN" ? "ADMIN" : "AGENT";
	const password = String(formData.get("password") || "");

	if (!name) return t("errors.requiredName", "Name is required.");
	if (!email) return t("errors.requiredEmail", "Email is required.");
	if (password.length < 8) return t("errors.tempPasswordMin", "Temporary password must be at least 8 characters.");

	const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
	if (existing) return t("errors.emailInUse", "Another account already uses that email.");

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
	const t = tServer;
	await requireAdmin();
	if (role !== "ADMIN" && role !== "AGENT") return t("errors.invalidRole", "Invalid role.");

	if (role === "AGENT") {
		const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
		const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
		if (target?.role === "ADMIN" && adminCount <= 1) {
			return t("errors.cannotRemoveLastAdmin", "Can't remove the last admin.");
		}
	}

	await prisma.user.update({ where: { id: userId }, data: { role } });
	revalidatePath("/settings");
}

export async function updateUserClientLink(userId, clientId) {
	await requireAdmin();
	const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
	if (!target || target.role !== "CLIENT") return "Only client accounts can be linked to a client profile.";

	if (clientId) {
		const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
		if (!client) return "Client profile not found.";
	}

	await prisma.user.update({ where: { id: userId }, data: { clientId: clientId || null } });
	revalidatePath("/settings");
}

/**
 * @param {string} userId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function resetUserPassword(userId, prevState, formData) {
	const t = tServer;
	await requireAdmin();
	const newPassword = String(formData.get("newPassword") || "");
	const confirmPassword = String(formData.get("confirmPassword") || "");

	if (newPassword.length < 8) return t("errors.newPasswordMin", "New password must be at least 8 characters.");
	if (newPassword !== confirmPassword) return t("errors.passwordConfirmMismatch", "New password and confirmation don't match.");

	const passwordHash = await bcrypt.hash(newPassword, 10);
	await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
	revalidatePath("/settings");
}

/** @param {string} userId */
export async function removeUser(userId) {
	const t = tServer;
	const admin = await requireAdmin();
	if (userId === admin.id) return t("errors.cannotRemoveOwnAccount", "You can't remove your own account.");

	const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
	if (!target) return t("errors.teammateNotFound", "Teammate not found.");

	if (target.role === "ADMIN") {
		const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
		if (adminCount <= 1) return t("errors.cannotRemoveLastAdmin", "Can't remove the last admin.");
	}

	try {
		await prisma.user.delete({ where: { id: userId } });
	} catch {
		return t(
			"errors.cannotRemoveAssignedData",
			`Can't remove ${target.name} - they still have notes, tasks, or clients assigned to them. Reassign those first.`,
		).replace("{name}", target.name);
	}

	revalidatePath("/settings");
}

export async function importTripsCsv(prevState, formData) {
	const t = tServer;
	await requireAdmin();
	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0) return t("errors.csvChooseFile", "Please choose a CSV file to import.");

	const rows = parseTripCsv(await file.text());
	if (rows.length === 0) return t("errors.csvNoRows", "That CSV file doesn't contain any trip rows.");

	const clients = await prisma.client.findMany({ select: { id: true, primaryEmail: true, secondaryEmail: true } });
	const clientsByEmail = new Map();
	for (const client of clients) {
		for (const email of [client.primaryEmail, client.secondaryEmail]) {
			if (email) clientsByEmail.set(email.trim().toLowerCase(), client.id);
		}
	}

	const statuses = new Set(["INQUIRY", "QUOTED", "BOOKED", "TRAVELING", "COMPLETED", "CANCELLED"]);
	let created = 0;
	let skipped = 0;
	for (const row of rows) {
		const clientId = clientsByEmail.get(row.clientEmail);
		const startDate = row.startDate ? new Date(`${row.startDate}T00:00:00.000Z`) : null;
		const endDate = row.endDate ? new Date(`${row.endDate}T00:00:00.000Z`) : null;
		if (
			!clientId ||
			!row.name ||
			!row.destination ||
			(startDate && Number.isNaN(startDate.getTime())) ||
			(endDate && Number.isNaN(endDate.getTime())) ||
			(startDate && endDate && endDate < startDate) ||
			!statuses.has(row.status)
		) {
			skipped += 1;
			continue;
		}
		await prisma.trip.create({
			data: {
				clientId,
				name: row.name,
				destination: row.destination,
				startDate,
				endDate,
				status: row.status,
				totalPrice: dollarsToCents(row.totalPrice),
				finalPaymentDate: row.finalPaymentDate ? new Date(`${row.finalPaymentDate}T00:00:00.000Z`) : null,
			},
		});
		created += 1;
	}

	revalidatePath("/trips");
	revalidatePath("/dashboard");
	return { created, skipped };
}
