"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { tServer } from "@/lib/i18n-server";
import { forfaitScope, inquiryScope } from "@/lib/visibility-scope";
import { createQuoteFromForfait, ensureTripLinked, normalizeImportOptions } from "@/app/api/forfaits/_conversion";

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
	const linkedForfaitQuoteIdValue = formData.get("linkedForfaitQuoteId");
	const requestedLinkedForfaitQuoteId =
		typeof linkedForfaitQuoteIdValue === "string" && linkedForfaitQuoteIdValue.trim() ? linkedForfaitQuoteIdValue.trim() : null;

	let assignedAgentId = null;
	if (user.role === "ADMIN") {
		assignedAgentId = requestedAssignedAgentId;
	} else {
		assignedAgentId = user.id;
	}

	let linkedForfaitQuoteId = null;
	if (requestedLinkedForfaitQuoteId) {
		const linkedForfait = await prisma.forfaitQuote.findFirst({
			where: { id: requestedLinkedForfaitQuoteId, ...forfaitScope(user) },
			select: { id: true },
		});
		if (!linkedForfait) {
			return t("errors.forfaitNotFound", "Package not found.");
		}
		linkedForfaitQuoteId = linkedForfait.id;
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
			linkedForfaitQuoteId,
		},
	});

	revalidatePath("/inquiries");
	revalidatePath("/dashboard");
}

export async function updateInquiryLinkedForfait(formData) {
	const user = await requireUser();
	const t = tServer;

	const inquiryIdValue = formData.get("inquiryId");
	const linkedForfaitQuoteIdValue = formData.get("linkedForfaitQuoteId");
	const inquiryId = typeof inquiryIdValue === "string" ? inquiryIdValue.trim() : "";
	const requestedLinkedForfaitQuoteId =
		typeof linkedForfaitQuoteIdValue === "string" && linkedForfaitQuoteIdValue.trim() ? linkedForfaitQuoteIdValue.trim() : null;

	if (!inquiryId) return;

	let linkedForfaitQuoteId = null;
	if (requestedLinkedForfaitQuoteId) {
		const linkedForfait = await prisma.forfaitQuote.findFirst({
			where: { id: requestedLinkedForfaitQuoteId, ...forfaitScope(user) },
			select: { id: true },
		});
		if (!linkedForfait) {
			return t("errors.forfaitNotFound", "Package not found.");
		}
		linkedForfaitQuoteId = linkedForfait.id;
	}

	await prisma.inquiry.updateMany({
		where: { id: inquiryId, ...inquiryScope(user) },
		data: { linkedForfaitQuoteId },
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

function parseProfileUpdateNotes(notes) {
	const labelToField = {
		"First name": "firstName",
		"Last name": "lastName",
		"Primary email": "primaryEmail",
		"Secondary email": "secondaryEmail",
		"Primary phone": "primaryPhone",
		"Secondary phone": "secondaryPhone",
		Address: "address",
		City: "city",
		"Province / State": "stateProvince",
		"Postal code": "postalCode",
		Country: "country",
		"Date of birth": "dateOfBirth",
		"Passport number": "passportNumber",
		"Passport issue date": "passportIssueDate",
		"Passport expiry date": "passportExpiry",
		"Redress number": "redressNumber",
		"Known traveler number": "knownTravelerNumber",
		Nationality: "nationality",
		"Travel preferences": "travelPreferences",
		"Dietary / medical notes": "dietaryNotes",
		"Mobility notes": "mobilityNotes",
	};
	const dateFields = new Set(["dateOfBirth", "passportIssueDate", "passportExpiry"]);
	const data = {};

	for (const line of String(notes || "").split("\n")) {
		const match = line.match(/^(.+): "[\s\S]*" -> "([\s\S]*)"$/);
		if (!match) continue;
		const field = labelToField[match[1]];
		if (!field) continue;
		const value = match[2] === "-" ? null : match[2];
		data[field] = dateFields.has(field) && value ? new Date(`${value}T00:00:00.000Z`) : value;
	}

	return data;
}

export async function approveClientProfileUpdate(formData) {
	const user = await requireUser();
	const inquiryIdValue = formData.get("inquiryId");
	const inquiryId = typeof inquiryIdValue === "string" ? inquiryIdValue.trim() : "";
	if (!inquiryId) return;

	const inquiry = await prisma.inquiry.findFirst({
		where: { id: inquiryId, source: "client_profile_update", ...inquiryScope(user) },
		select: { id: true, name: true, notes: true, convertedClientId: true },
	});
	if (!inquiry?.convertedClientId) return;

	const data = parseProfileUpdateNotes(inquiry.notes);
	if (Object.keys(data).length === 0) return;

	await prisma.client.update({ where: { id: inquiry.convertedClientId }, data });
	await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: "CONVERTED", convertedAt: new Date() } });

	await logActivity({
		entityType: "Client",
		entityId: inquiry.convertedClientId,
		action: "updated",
		description: `Approved profile update request for ${inquiry.name}`,
		userId: user.id,
		clientId: inquiry.convertedClientId,
	});

	revalidatePath("/inquiries");
	revalidatePath(`/clients/${inquiry.convertedClientId}`);
	revalidatePath(`/clients/${inquiry.convertedClientId}/profile`);
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
			linkedForfaitQuoteId: true,
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

	if (inquiry.linkedForfaitQuoteId && (clientId || tripId)) {
		await prisma.forfaitQuote.updateMany({
			where: {
				id: inquiry.linkedForfaitQuoteId,
				...forfaitScope(user),
			},
			data: {
				clientId,
				tripId,
			},
		});
	}

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
	revalidatePath("/packages");
	revalidatePath("/forfaits");
	revalidatePath("/dashboard");

	if (tripId && inquiry.linkedForfaitQuoteId) {
		redirect(`/packages?projectId=${inquiry.linkedForfaitQuoteId}&tripId=${tripId}&clientId=${clientId || ""}`);
	}

	if (tripId) {
		redirect(`/trips/${tripId}/overview`);
	}
	if (clientId) {
		redirect(`/clients/${clientId}`);
	}
}

export async function convertInquiryToQuoteFromPackage(formData) {
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
			assignedAgentId: true,
			linkedForfaitQuoteId: true,
			convertedClientId: true,
			convertedTripId: true,
			convertedQuoteId: true,
		},
	});
	if (!inquiry) return t("errors.inquiryNotFound", "Inquiry not found.");
	if (!inquiry.linkedForfaitQuoteId) {
		return t("errors.inquiryNeedsLinkedPackage", "Link a package before creating a quote.");
	}
	if (inquiry.convertedQuoteId) {
		const existingQuote = await prisma.quote.findUnique({
			where: { id: inquiry.convertedQuoteId },
			select: { id: true, tripId: true },
		});
		if (existingQuote?.tripId) {
			redirect(`/trips/${existingQuote.tripId}/quotes`);
		}
		if (inquiry.convertedTripId) {
			redirect(`/trips/${inquiry.convertedTripId}/quotes`);
		}
	}

	const { firstName, lastName } = splitName(inquiry.name);

	const existingClient = inquiry.email ? await prisma.client.findFirst({ where: { primaryEmail: inquiry.email }, select: { id: true } }) : null;

	let clientId = inquiry.convertedClientId || existingClient?.id || null;
	let tripId = inquiry.convertedTripId || null;

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

	if (!tripId && clientId) {
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

	const linkedForfait = await prisma.forfaitQuote.findFirst({
		where: {
			id: inquiry.linkedForfaitQuoteId,
			...forfaitScope(user),
		},
	});
	if (!linkedForfait) {
		return t("errors.forfaitNotFound", "Package not found.");
	}

	if (clientId || tripId) {
		await prisma.forfaitQuote.updateMany({
			where: { id: linkedForfait.id, ...forfaitScope(user) },
			data: { clientId, tripId },
		});
	}

	const tripLink = await ensureTripLinked(
		{
			...linkedForfait,
			clientId,
			tripId,
		},
		linkedForfait.payload,
		normalizeImportOptions({ importIntoExistingTrip: true }),
	);
	if (tripLink?.error) {
		return tripLink.error;
	}

	const quoteResult = await createQuoteFromForfait({
		source: {
			...linkedForfait,
			tripId: tripLink.tripId,
		},
		tripId: tripLink.tripId,
	});
	if (quoteResult?.error) {
		return quoteResult.error;
	}

	await prisma.trip.updateMany({
		where: { id: tripLink.tripId, status: "INQUIRY" },
		data: { status: "QUOTED" },
	});

	await prisma.inquiry.update({
		where: { id: inquiry.id },
		data: {
			status: "CONVERTED",
			convertedClientId: clientId,
			convertedTripId: tripLink.tripId,
			convertedQuoteId: quoteResult.quote.id,
			convertedAt: new Date(),
		},
	});

	if (clientId) {
		await logActivity({
			entityType: "Inquiry",
			entityId: inquiry.id,
			action: "converted",
			description: `Inquiry from ${inquiry.name} converted and quoted from linked package`,
			userId: user.id,
			clientId,
		});
	}

	await logActivity({
		entityType: "Quote",
		entityId: quoteResult.quote.id,
		action: "created",
		description: `Quote created from linked package ${linkedForfait.name}`,
		userId: user.id,
		clientId,
	});

	revalidatePath("/inquiries");
	revalidatePath("/clients");
	revalidatePath("/trips");
	revalidatePath("/packages");
	revalidatePath("/forfaits");
	revalidatePath("/dashboard");
	revalidatePath(`/trips/${tripLink.tripId}/quotes`);

	redirect(`/trips/${tripLink.tripId}/quotes`);
}
