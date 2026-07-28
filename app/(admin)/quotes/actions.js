"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { tServer } from "@/lib/i18n-server";

export async function createQuoteFromHub(formData) {
	const t = tServer;
	const user = await requireUser();
	const tripIdValue = formData.get("tripId");
	const titleValue = formData.get("title");
	const validUntilValue = formData.get("validUntil");
	const notesValue = formData.get("notes");

	const tripId = typeof tripIdValue === "string" ? tripIdValue.trim() : "";
	const title = typeof titleValue === "string" ? titleValue.trim() : "";

	if (!tripId) return t("errors.tripNotFound", "Trip not found.");
	if (!title) return t("errors.requiredTitle", "Title is required.");

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true, name: true, clientId: true },
	});
	if (!trip) return t("errors.tripNotFound", "Trip not found.");

	const quote = await prisma.quote.create({
		data: {
			tripId: trip.id,
			title,
			validUntil: typeof validUntilValue === "string" && validUntilValue ? new Date(validUntilValue) : null,
			notes: typeof notesValue === "string" && notesValue.trim() ? notesValue.trim() : null,
		},
	});

	await logActivity({
		entityType: "Quote",
		entityId: quote.id,
		action: "created",
		description: `Quote "${quote.title}" created for "${trip.name}"`,
		userId: user.id,
		clientId: trip.clientId,
	});

	revalidatePath("/quotes");
	revalidatePath(`/trips/${trip.id}/quotes`);
}
