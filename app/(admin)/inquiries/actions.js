"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { tServer } from "@/lib/i18n-server";
import { inquiryScope } from "@/lib/visibility-scope";

function splitName(fullName) {
	const clean = String(fullName || "").trim();
	if (!clean) return { firstName: "Lead", lastName: "Client" };
	const parts = clean.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return { firstName: parts[0], lastName: "Client" };
	return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] };
}

export async function createInquiry(formData) {
	const user = await requireUser();
	const t = tServer;

	const nameValue = formData.get("name");
	const emailValue = formData.get("email");
	const phoneValue = formData.get("phone");
	const sourceValue = formData.get("source");
	const notesValue = formData.get("notes");

	const name = typeof nameValue === "string" ? nameValue.trim() : "";
	if (!name) return t("errors.requiredName", "Name is required.");

	const email = typeof emailValue === "string" && emailValue.trim() ? emailValue.trim() : null;
	const phone = typeof phoneValue === "string" && phoneValue.trim() ? phoneValue.trim() : null;
	const source = typeof sourceValue === "string" && sourceValue.trim() ? sourceValue.trim() : "manual";
	const notes = typeof notesValue === "string" && notesValue.trim() ? notesValue.trim() : null;
	const assignedAgentIdValue = formData.get("assignedAgentId");
	const requestedAssignedAgentId = typeof assignedAgentIdValue === "string" && assignedAgentIdValue.trim() ? assignedAgentIdValue.trim() : null;

	let assignedAgentId = null;
	if (user.role === "ADMIN") {
		assignedAgentId = requestedAssignedAgentId;
	} else {
		assignedAgentId = user.id;
	}

	await prisma.inquiry.create({
		data: {
			name,
			email,
			phone,
			source,
			notes,
			status: "NEW",
			assignedAgentId,
		},
	});

	revalidatePath("/inquiries");
	revalidatePath("/dashboard");
}

export async function updateInquiryStatus(formData) {
	const user = await requireUser();

	const inquiryIdValue = formData.get("inquiryId");
	const statusValue = formData.get("status");
	const inquiryId = typeof inquiryIdValue === "string" ? inquiryIdValue.trim() : "";
	const status = typeof statusValue === "string" ? statusValue.trim() : "";

	const allowed = new Set(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]);
	if (!inquiryId || !allowed.has(status)) return;

	await prisma.inquiry.updateMany({ where: { id: inquiryId, ...inquiryScope(user) }, data: { status } });

	revalidatePath("/inquiries");
	revalidatePath("/dashboard");
}

export async function convertInquiryToClient(formData) {
	const user = await requireUser();
	const t = tServer;

	const inquiryIdValue = formData.get("inquiryId");
	const inquiryId = typeof inquiryIdValue === "string" ? inquiryIdValue.trim() : "";
	if (!inquiryId) return t("errors.inquiryNotFound", "Inquiry not found.");

	const inquiry = await prisma.inquiry.findFirst({
		where: {
			id: inquiryId,
			...inquiryScope(user),
		},
		select: {
			id: true,
			name: true,
			email: true,
			phone: true,
			status: true,
			assignedAgentId: true,
			convertedClientId: true,
			convertedTripId: true,
		},
	});
	if (!inquiry) return t("errors.inquiryNotFound", "Inquiry not found.");

	if (inquiry.convertedTripId) {
		redirect(`/trips/${inquiry.convertedTripId}/overview`);
	}
	if (inquiry.convertedClientId) {
		redirect(`/clients/${inquiry.convertedClientId}`);
	}

	const { firstName, lastName } = splitName(inquiry.name);

	const existingClient = inquiry.email
		? await prisma.client.findFirst({ where: { primaryEmail: inquiry.email }, select: { id: true, firstName: true, lastName: true } })
		: null;

	let clientId = existingClient?.id || null;
	let tripId = null;

	if (!clientId) {
		const client = await prisma.client.create({
			data: {
				firstName,
				lastName,
				primaryEmail: inquiry.email || null,
				primaryPhone: inquiry.phone || null,
				status: "ACTIVE",
				assignedAgentId: inquiry.assignedAgentId || (user.role === "ADMIN" ? null : user.id),
			},
			select: { id: true },
		});
		clientId = client.id;
	}

	if (clientId) {
		const trip = await prisma.trip.create({
			data: {
				clientId,
				name: `Inquiry - ${inquiry.name}`,
				destination: "To define",
				status: "INQUIRY",
			},
			select: { id: true },
		});
		tripId = trip.id;
	}

	await prisma.inquiry.update({
		where: { id: inquiry.id },
		data: {
			status: "CONVERTED",
			convertedClientId: clientId,
			convertedTripId: tripId,
			convertedAt: new Date(),
		},
	});

	if (clientId) {
		await logActivity({
			entityType: "Inquiry",
			entityId: inquiry.id,
			action: "converted",
			description: `Inquiry from ${inquiry.name} converted to client/trip`,
			userId: user.id,
			clientId,
		});
	}

	revalidatePath("/inquiries");
	revalidatePath("/clients");
	revalidatePath("/trips");
	revalidatePath("/dashboard");

	if (tripId) {
		redirect(`/trips/${tripId}/overview`);
	}
	if (clientId) {
		redirect(`/clients/${clientId}`);
	}
}
