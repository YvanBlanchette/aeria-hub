"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTripStaffAccess, requireTripStaffAccessBySegment } from "@/lib/trip-access";
import { logActivity } from "@/lib/activity";
import { SEGMENT_DETAIL_FIELDS, SEGMENT_TYPE_MAP, groupSegmentsByDay } from "@/lib/trip-segments";
import { parseLocalDateTime, dollarsToCents } from "@/lib/format";
import { validateUploadedFile, saveUploadedFile, deleteStoredFile } from "@/lib/documents";
import { computeCommissionPortions } from "@/lib/commissions";
import { inferCruiseEndpoints, toSegmentDateTime } from "@/lib/cruisemapper-import";
import { tServer } from "@/lib/i18n-server";

function readSegmentFields(formData) {
	const get = (name) => {
		const value = formData.get(name);
		return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	};
	const getDateTime = (name) => parseLocalDateTime(get(name));

	const type = SEGMENT_TYPE_MAP[get("type")] ? get("type") : "OTHER";
	const detailFields = SEGMENT_DETAIL_FIELDS[type] || [];
	const details = {};
	for (const field of detailFields) {
		const value = get(`detail_${field.key}`);
		if (value != null) details[field.key] = value;
	}

	const supplierId = get("supplierId");

	return {
		type,
		title: get("title"),
		supplierId: supplierId === "none" ? null : supplierId,
		confirmationNumber: get("confirmationNumber"),
		startDateTime: getDateTime("startDateTime"),
		endDateTime: getDateTime("endDateTime"),
		location: get("location"),
		cost: dollarsToCents(get("cost")),
		notes: get("notes"),
		details: Object.keys(details).length > 0 ? details : undefined,
	};
}

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createSegment(tripId, prevState, formData) {
	const t = tServer;
	const { user } = await requireTripStaffAccess(tripId);
	const fields = readSegmentFields(formData);
	if (!fields.title) return t("errors.requiredTitle", "Title is required.");
	if (fields.startDateTime && fields.endDateTime && fields.endDateTime < fields.startDateTime) {
		return t("errors.endBeforeStart", "End can't be before the start.");
	}

	const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
	if (!trip) return t("errors.tripNotFound", "Trip not found.");

	const maxSort = await prisma.tripSegment.aggregate({ where: { tripId }, _max: { sortOrder: true } });
	const segment = await prisma.tripSegment.create({
		data: { ...fields, tripId, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
	});

	await logActivity({
		entityType: "TripSegment",
		entityId: segment.id,
		action: "created",
		description: `${SEGMENT_TYPE_MAP[fields.type]?.label || fields.type} segment "${fields.title}" added to "${trip.name}"`,
		userId: user.id,
		clientId: trip.clientId,
	});

	revalidatePath(`/trips/${tripId}/itinerary`);
	revalidatePath(`/trips/${tripId}/overview`);
}

/**
 * @param {string} segmentId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateSegment(segmentId, prevState, formData) {
	const t = tServer;
	const { user } = await requireTripStaffAccessBySegment(segmentId);
	const fields = readSegmentFields(formData);
	if (!fields.title) return t("errors.requiredTitle", "Title is required.");
	if (fields.startDateTime && fields.endDateTime && fields.endDateTime < fields.startDateTime) {
		return t("errors.endBeforeStart", "End can't be before the start.");
	}

	const segment = await prisma.tripSegment.update({
		where: { id: segmentId },
		data: { ...fields, details: fields.details ?? null },
		include: { trip: { select: { id: true, clientId: true, name: true } } },
	});

	await logActivity({
		entityType: "TripSegment",
		entityId: segmentId,
		action: "updated",
		description: `Segment "${segment.title}" updated`,
		userId: user.id,
		clientId: segment.trip.clientId,
	});

	revalidatePath(`/trips/${segment.trip.id}/itinerary`);
	revalidatePath(`/trips/${segment.trip.id}/overview`);
}

/**
 * @param {string} segmentId
 * @param {string} tripId
 */
export async function deleteSegment(segmentId, tripId) {
	await requireTripStaffAccess(tripId);
	const existing = await prisma.tripSegment.findFirst({ where: { id: segmentId, tripId } });
	if (!existing) return;
	await prisma.tripSegment.delete({ where: { id: segmentId } });
	revalidatePath(`/trips/${tripId}/itinerary`);
	revalidatePath(`/trips/${tripId}/overview`);
}

/**
 * Imports one selected CruiseMapper itinerary (pre-scraped JSON) into the
 * current trip as CRUISE segments. This never creates a new trip.
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function importCruiseMapperItinerary(tripId, prevState, formData) {
	const t = tServer;
	const { user } = await requireTripStaffAccess(tripId);
	const itineraryId = formData.get("itineraryId");
	const mode = formData.get("mode") === "replace" ? "replace" : "append";
	const includeSeaDays = formData.get("includeSeaDays") === "on";

	if (typeof itineraryId !== "string" || !itineraryId.trim()) {
		return t("errors.chooseStoredItinerary", "Choose a stored itinerary first.");
	}

	const selected = await prisma.scrapedCruiseItinerary.findUnique({
		where: { id: itineraryId },
		select: { payload: true, shipName: true, title: true },
	});
	if (!selected) {
		return t("errors.selectedItineraryNotFound", "Selected itinerary was not found in the database.");
	}

	const payload = selected.payload && typeof selected.payload === "object" ? selected.payload : null;
	const payloadCalls = Array.isArray(payload?.port_calls) ? payload.port_calls : [];

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true, name: true, clientId: true },
	});
	if (!trip) return t("errors.tripNotFound", "Trip not found.");

	const sourceCalls = payloadCalls.filter((call) => includeSeaDays || !call.is_sea_day);
	if (sourceCalls.length === 0) {
		return t("errors.noImportablePortCalls", "No importable port calls found for this itinerary with the current options.");
	}

	const { departurePort, arrivalPort } = inferCruiseEndpoints(payloadCalls);

	const createdCount = await prisma.$transaction(async (tx) => {
		if (mode === "replace") {
			await tx.tripSegment.deleteMany({ where: { tripId, type: "CRUISE" } });
		}

		const maxSort = await tx.tripSegment.aggregate({
			where: { tripId },
			_max: { sortOrder: true },
		});
		let nextSort = (maxSort._max.sortOrder ?? 0) + 1;

		for (let i = 0; i < sourceCalls.length; i++) {
			const call = sourceCalls[i];
			const startDateTime = toSegmentDateTime(call.date, call.arrival || call.departure || null);
			let endDateTime = toSegmentDateTime(call.date, call.departure || call.arrival || null);
			if (endDateTime < startDateTime) {
				endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
			}

			const dayNumber = call.day ?? i + 1;
			const seaTag = call.is_sea_day ? " (Sea Day)" : "";
			const notes = [call.is_embark ? "Embarkation" : null, call.is_debark ? "Debarkation" : null, payload?.source_url ? `Source: ${payload.source_url}` : null]
				.filter(Boolean)
				.join(" | ");

			await tx.tripSegment.create({
				data: {
					tripId,
					type: "CRUISE",
					title: `Day ${dayNumber} · ${call.port_name}${seaTag}`,
					startDateTime,
					endDateTime,
					location: call.port_name,
					notes: notes || null,
					details: {
						shipName: payload?.ship_name || selected.shipName || "",
						departurePort: departurePort || "",
						arrivalPort: arrivalPort || "",
					},
					sortOrder: nextSort,
				},
			});

			nextSort += 1;
		}

		return sourceCalls.length;
	});

	await logActivity({
		entityType: "Trip",
		entityId: tripId,
		action: "updated",
		description: `Imported ${createdCount} cruise segment${createdCount === 1 ? "" : "s"} from scraped itinerary into "${trip.name}"`,
		userId: user.id,
		clientId: trip.clientId,
	});

	revalidatePath(`/trips/${tripId}/itinerary`);
	revalidatePath(`/trips/${tripId}/overview`);

	return {
		imported: createdCount,
		mode,
		shipName: payload?.ship_name || selected.shipName || null,
		title: payload?.title || selected.title || null,
	};
}

/**
 * Swaps a segment's sortOrder with its neighbor within the same day (or the
 * Unscheduled bucket) — moving further isn't possible across day boundaries,
 * since each day is its own independently-ordered list.
 * @param {string} segmentId
 * @param {string} tripId
 * @param {"up" | "down"} direction
 */
export async function reorderSegment(segmentId, tripId, direction) {
	await requireTripStaffAccess(tripId);

	const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { startDate: true, endDate: true } });
	if (!trip) return;

	const segments = await prisma.tripSegment.findMany({
		where: { tripId },
		orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
	});

	const { days, unscheduled } = groupSegmentsByDay(segments, trip);
	const groups = [...days.map((d) => d.segments), unscheduled];

	for (const group of groups) {
		const index = group.findIndex((s) => s.id === segmentId);
		if (index === -1) continue;

		const swapIndex = direction === "up" ? index - 1 : index + 1;
		if (swapIndex < 0 || swapIndex >= group.length) return;

		const current = group[index];
		const neighbor = group[swapIndex];
		await prisma.$transaction([
			prisma.tripSegment.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
			prisma.tripSegment.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
		]);
		break;
	}

	revalidatePath(`/trips/${tripId}/itinerary`);
}

/**
 * Uploads a document (ticket, voucher, confirmation...) linked directly to
 * a segment. The client link is derived from the segment's trip — never
 * trusted from the client — so it also shows up on that client's
 * Documents tab.
 * @param {string} segmentId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function uploadSegmentDocument(segmentId, prevState, formData) {
	const t = tServer;
	const file = formData.get("file");
	const type = formData.get("type") || "TICKET";

	const validationError = validateUploadedFile(file);
	if (validationError) return validationError;

	const segment = await prisma.tripSegment.findUnique({
		where: { id: segmentId },
		include: { trip: { select: { id: true, clientId: true, name: true } } },
	});
	if (!segment) return t("errors.segmentNotFound", "Segment not found.");
	const { user } = await requireTripStaffAccess(segment.trip.id);

	const saved = await saveUploadedFile(segment.trip.clientId, file);

	await prisma.document.create({
		data: {
			clientId: segment.trip.clientId,
			segmentId,
			type,
			...saved,
		},
	});

	await logActivity({
		entityType: "Document",
		entityId: segmentId,
		action: "created",
		description: `Document "${file.name}" uploaded to "${segment.title}" (${segment.trip.name})`,
		userId: user.id,
		clientId: segment.trip.clientId,
	});

	revalidatePath(`/trips/${segment.trip.id}/itinerary`);
	revalidatePath(`/clients/${segment.trip.clientId}/documents`);
}

/**
 * @param {string} documentId
 * @param {string} segmentId
 * @param {string} tripId
 */
export async function deleteSegmentDocument(documentId, segmentId, tripId) {
	const { user } = await requireTripStaffAccessBySegment(segmentId);
	const document = await prisma.document.findFirst({ where: { id: documentId, segmentId } });
	if (!document) return;

	await prisma.document.delete({ where: { id: documentId } });
	await deleteStoredFile(document.storagePath);

	revalidatePath(`/trips/${tripId}/itinerary`);
	if (document.clientId) {
		revalidatePath(`/clients/${document.clientId}/documents`);
	}
}

/**
 * Sets a segment's total commission, splitting it into portions (see
 * computeCommissionPortions). Portions already marked RECEIVED are left
 * untouched so re-entering the total never erases a confirmed receipt;
 * PENDING portions are updated in place, and extra/missing portions are
 * added or removed to match the new split.
 * @param {string} segmentId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function setSegmentCommission(segmentId, prevState, formData) {
	const t = tServer;
	const amount = dollarsToCents(formData.get("amount"));
	if (amount == null || amount < 0) return t("errors.validCommissionAmount", "Enter a valid commission amount.");

	const segment = await prisma.tripSegment.findUnique({
		where: { id: segmentId },
		include: {
			trip: { select: { id: true, createdAt: true, endDate: true } },
			commissions: { orderBy: { createdAt: "asc" } },
			supplier: { select: { name: true } },
		},
	});
	if (!segment) return "Segment not found.";
	await requireTripStaffAccess(segment.trip.id);

	const portions = computeCommissionPortions(amount, segment, segment.trip);
	const existing = segment.commissions;

	await prisma.$transaction(async (tx) => {
		for (let i = 0; i < Math.max(portions.length, existing.length); i++) {
			const target = portions[i];
			const current = existing[i];
			if (current?.status === "RECEIVED") continue;

			if (target && current) {
				await tx.segmentCommission.update({
					where: { id: current.id },
					data: { amount: target.amount, dueDate: target.dueDate },
				});
			} else if (target && !current) {
				await tx.segmentCommission.create({
					data: { segmentId, amount: target.amount, dueDate: target.dueDate },
				});
			} else if (!target && current) {
				await tx.segmentCommission.delete({ where: { id: current.id } });
			}
		}
	});

	revalidatePath(`/trips/${segment.trip.id}/itinerary`);
	revalidatePath("/commissions");
}

/**
 * @param {string} segmentId
 * @param {string} tripId
 */
export async function deleteSegmentCommission(segmentId, tripId) {
	await requireTripStaffAccess(tripId);
	const segment = await prisma.tripSegment.findFirst({ where: { id: segmentId, tripId } });
	if (!segment) return;
	await prisma.segmentCommission.deleteMany({ where: { segmentId } });
	revalidatePath(`/trips/${tripId}/itinerary`);
	revalidatePath("/commissions");
}

/**
 * @param {string} portionId
 * @param {boolean} received
 */
export async function setCommissionReceived(portionId, received) {
	const portion = await prisma.segmentCommission.findUnique({
		where: { id: portionId },
		include: { segment: { select: { tripId: true } } },
	});
	if (!portion) return;
	await requireTripStaffAccess(portion.segment.tripId);

	await prisma.segmentCommission.update({
		where: { id: portionId },
		data: { status: received ? "RECEIVED" : "PENDING", receivedDate: received ? new Date() : null },
	});

	revalidatePath(`/trips/${portion.segment.tripId}/itinerary`);
	revalidatePath("/commissions");
}
