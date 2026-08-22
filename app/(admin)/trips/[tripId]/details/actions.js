"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTripAccessBySegment } from "@/lib/trip-access";
import { tServer } from "@/lib/i18n-server";

/**
 * Lets a client update only non-commercial booking details on a segment they
 * can access. Staff edits continue to use the full segment editor.
 * @param {string} segmentId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateClientSegmentDetails(segmentId, prevState, formData) {
	const { access } = await requireTripAccessBySegment(segmentId);
	if (access !== "client") return tServer("errors.clientOnlyAction", "This action is only available in the client portal.");

	const get = (name) => {
		const value = formData.get(name);
		return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	};

	const segment = await prisma.tripSegment.findUnique({ where: { id: segmentId }, select: { id: true, tripId: true, type: true, details: true } });
	if (!segment) return tServer("errors.segmentNotFound", "Segment not found.");

	const details = segment.details && typeof segment.details === "object" && !Array.isArray(segment.details) ? { ...segment.details } : {};
	if (segment.type === "FLIGHT") {
		details.seatNumber = get("seatNumber") || "";
	}

	await prisma.tripSegment.update({
		where: { id: segmentId },
		data: {
			confirmationNumber: get("confirmationNumber"),
			details,
		},
	});

	revalidatePath(`/trips/${segment.tripId}/details`);
	revalidatePath(`/trips/${segment.tripId}/itinerary`);
	revalidatePath(`/trips/${segment.tripId}/overview`);
}
