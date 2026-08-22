"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { tServer } from "@/lib/i18n-server";
import { parseCsv, rowsToObjects } from "@/lib/csv";
import { detectCsvFormat, mapRowToClient } from "@/lib/contacts-csv";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

function readClientFields(formData) {
	const get = (name) => {
		const value = formData.get(name);
		return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	};
	const getDate = (name) => {
		const value = get(name);
		return value ? new Date(value) : null;
	};

	return {
		firstName: get("firstName"),
		lastName: get("lastName"),
		primaryEmail: get("primaryEmail"),
		secondaryEmail: get("secondaryEmail"),
		primaryPhone: get("primaryPhone"),
		secondaryPhone: get("secondaryPhone"),
		address: get("address"),
		city: get("city"),
		stateProvince: get("stateProvince"),
		postalCode: get("postalCode"),
		country: get("country"),
		dateOfBirth: getDate("dateOfBirth"),
		passportNumber: get("passportNumber"),
		passportIssueDate: getDate("passportIssueDate"),
		passportExpiry: getDate("passportExpiry"),
		redressNumber: get("redressNumber"),
		knownTravelerNumber: get("knownTravelerNumber"),
		nationality: get("nationality"),
		travelPreferences: get("travelPreferences"),
		dietaryNotes: get("dietaryNotes"),
		mobilityNotes: get("mobilityNotes"),
		status: get("status") || "ACTIVE",
		assignedAgentId: get("assignedAgentId"),
	};
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createClient(prevState, formData) {
	const t = tServer;
	const user = await requireUser();
	const fields = readClientFields(formData);
	const createPortalAccess = formData.get("createPortalAccess") === "on";

	if (!fields.firstName || !fields.lastName) {
		return t("errors.requiredFirstLastName", "First and last name are required.");
	}
	if (createPortalAccess && !fields.primaryEmail) {
		return "A primary email is required to create portal access.";
	}

	let portalPasswordHash = null;
	if (createPortalAccess) {
		const existingUser = await prisma.user.findFirst({ where: { email: { equals: fields.primaryEmail, mode: "insensitive" } }, select: { id: true } });
		if (existingUser) return "This email is already used by another account.";
		portalPasswordHash = await bcrypt.hash(`Aeria-${crypto.randomBytes(5).toString("hex")}`, 10);
	}

	const client = await prisma.$transaction(async (tx) => {
		const createdClient = await tx.client.create({ data: fields });
		if (portalPasswordHash) {
			await tx.user.create({
				data: {
					name: `${createdClient.firstName} ${createdClient.lastName}`.trim(),
					email: fields.primaryEmail.trim().toLowerCase(),
					passwordHash: portalPasswordHash,
					role: "CLIENT",
					clientId: createdClient.id,
				},
			});
		}
		await tx.activityLog.create({
			data: {
				entityType: "Client",
				entityId: createdClient.id,
				action: "created",
				description: `Client ${createdClient.firstName} ${createdClient.lastName} created`,
				userId: user.id,
				clientId: createdClient.id,
			},
		});
		return createdClient;
	});

	revalidatePath("/clients");
	redirect(`/clients/${client.id}`);
}

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateClient(clientId, prevState, formData) {
	const t = tServer;
	const user = await requireUser();
	const fields = readClientFields(formData);

	if (!fields.firstName || !fields.lastName) {
		return t("errors.requiredFirstLastName", "First and last name are required.");
	}

	await prisma.client.update({ where: { id: clientId }, data: fields });

	await logActivity({
		entityType: "Client",
		entityId: clientId,
		action: "updated",
		description: "Client profile updated",
		userId: user.id,
		clientId,
	});

	revalidatePath("/clients");
	revalidatePath(`/clients/${clientId}`);
	redirect(`/clients/${clientId}`);
}

export async function setClientPortalEnabled(clientId, enabled) {
	await requireAdmin();
	const client = await prisma.client.findUnique({ where: { id: clientId }, select: { portalUser: { select: { id: true } } } });
	if (!client?.portalUser) return "Create portal access for this client first.";
	await prisma.user.update({ where: { id: client.portalUser.id }, data: { portalEnabled: Boolean(enabled) } });
	revalidatePath("/clients");
	revalidatePath(`/clients/${clientId}`);
}

export async function createClientPortalAccess(clientId, prevState, formData) {
	const admin = await requireAdmin();
	try {
		const client = await prisma.client.findUnique({
			where: { id: clientId },
			select: { id: true, firstName: true, lastName: true, primaryEmail: true, portalUser: { select: { id: true, email: true } } },
		});
		if (!client) return { error: "Client not found." };
		if (!client.primaryEmail) return { error: "This client needs a primary email before portal access can be created." };

		const email = client.primaryEmail.trim().toLowerCase();
		const existingUser = await prisma.user.findFirst({
			where: { email: { equals: email, mode: "insensitive" } },
			select: { id: true, role: true, clientId: true },
		});
		if (existingUser && existingUser.clientId !== client.id) return { error: "This email is already used by another account." };

		const temporaryPassword = `Aeria-${crypto.randomBytes(5).toString("hex")}`;
		const passwordHash = await bcrypt.hash(temporaryPassword, 10);
		const user = client.portalUser || existingUser;
		if (user) {
			await prisma.user.update({ where: { id: user.id }, data: { email, role: "CLIENT", clientId: client.id, portalEnabled: true, passwordHash } });
		} else {
			await prisma.user.create({
				data: { name: `${client.firstName} ${client.lastName}`.trim(), email, role: "CLIENT", clientId: client.id, portalEnabled: true, passwordHash },
			});
		}

		try {
			await logActivity({
				entityType: "Client",
				entityId: client.id,
				action: "portal_access_created",
				description: `Portal access created for ${client.firstName} ${client.lastName}`,
				userId: admin.id,
				clientId: client.id,
			});
		} catch (activityError) {
			console.error("Portal access audit log failed", activityError);
		}
		revalidatePath(`/clients/${client.id}`);
		revalidatePath(`/clients/${client.id}/profile`);
		revalidatePath("/settings");
		return { email, temporaryPassword };
	} catch (error) {
		console.error("createClientPortalAccess failed", error);
		if (error?.code === "P2002") return { error: "This email is already used by another account." };
		if (error?.code === "P2025") return { error: "The client or account could not be found. Refresh the page and try again." };
		if (error?.code === "P2003") return { error: "The database is missing the client portal relationship. Apply the latest Prisma migration." };
		return { error: "Unable to create portal access. Please try again." };
	}
}

/**
 * Imports clients from a Google Contacts or Outlook CSV export.
 * Rows with an email matching an existing client are skipped rather
 * than creating a duplicate.
 * @param {string | undefined} prevState
 * @param {FormData} formData
 * @returns {Promise<string | { created: number, skipped: number, errors: number, format: string }>}
 */
export async function importClientsCsv(prevState, formData) {
	const t = tServer;
	const user = await requireAdmin();
	const file = formData.get("file");

	if (!(file instanceof File) || file.size === 0) {
		return t("errors.csvChooseFile", "Please choose a CSV file to import.");
	}

	const text = await file.text();
	const rows = rowsToObjects(parseCsv(text));

	if (rows.length === 0) {
		return t("errors.csvNoRows", "That CSV file doesn't contain any contact rows.");
	}

	const format = detectCsvFormat(Object.keys(rows[0]));
	if (!format) {
		return t(
			"errors.csvUnknownFormat",
			"Couldn't recognize this as a Google Contacts or Outlook CSV export. Make sure you're uploading one of those export formats.",
		);
	}

	let created = 0;
	let skipped = 0;
	let errors = 0;

	for (const row of rows) {
		const fields = mapRowToClient(row, format);
		if (!fields || (!fields.firstName && !fields.lastName)) {
			skipped++;
			continue;
		}

		if (fields.primaryEmail) {
			const existing = await prisma.client.findFirst({
				where: { primaryEmail: fields.primaryEmail },
				select: { id: true },
			});
			if (existing) {
				skipped++;
				continue;
			}
		}

		const { note, ...clientFields } = fields;

		try {
			const client = await prisma.client.create({
				data: {
					...clientFields,
					firstName: clientFields.firstName || "Unknown",
					lastName: clientFields.lastName || "",
				},
			});
			if (note) {
				await prisma.note.create({ data: { clientId: client.id, authorId: user.id, body: note } });
			}
			created++;
		} catch {
			errors++;
		}
	}

	await logActivity({
		entityType: "Import",
		entityId: "csv",
		action: "imported",
		description: `Imported ${created} client${created === 1 ? "" : "s"} from ${format === "google" ? "Google Contacts" : "Outlook"} CSV (${skipped} skipped, ${errors} errors)`,
		userId: user.id,
	});

	revalidatePath("/clients");
	return { created, skipped, errors, format };
}

/** @param {string} clientId */
export async function deleteClient(clientId) {
	const user = await requireUser();
	await prisma.client.delete({ where: { id: clientId } });

	await logActivity({
		entityType: "Client",
		entityId: clientId,
		action: "deleted",
		description: "Client deleted",
		userId: user.id,
	});

	revalidatePath("/clients");
	redirect("/clients");
}
