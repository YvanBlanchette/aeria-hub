"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createInspireSale(formData) {
	const user = await requireUser();
	const influencerId = formData.get("influencerId")?.toString().trim();
	const offerId = formData.get("offerId")?.toString().trim() || null;
	const clientName = formData.get("clientName")?.toString().trim();
	const bookingAmountCents = Number(formData.get("bookingAmountCents") || 0);
	const commissionRate = Number(formData.get("commissionRate") || 0);
	const commissionAmountCents = Math.round(bookingAmountCents * (commissionRate / 100));
	const status = formData.get("status")?.toString().trim() || "CONFIRMED";
	const notes = formData.get("notes")?.toString().trim() || null;

	if (!influencerId || !clientName) {
		throw new Error("Influencer and client name are required.");
	}

	try {
		await prisma.inspireSale.create({
			data: {
				influencerId,
				offerId,
				clientName,
				bookingAmountCents: Number.isFinite(bookingAmountCents) ? bookingAmountCents : 0,
				commissionRate: Number.isFinite(commissionRate) ? commissionRate : 0,
				commissionAmountCents,
				status,
				notes,
			},
		});
	} catch (error) {
		console.error("Failed to create Inspire sale", error);
		throw new Error("Unable to save the sale right now. Please ensure the Inspire tables exist on this server.");
	}

	revalidatePath("/inspire");
	revalidatePath("/inspire/sales");
	redirect("/inspire/sales");
}

export async function updateOfferShareUrl(offerId) {
	const user = await requireUser();

	try {
		const offer = await prisma.inspireOffer.findUnique({ where: { id: offerId }, select: { id: true } });

		if (!offer) {
			throw new Error("Offer not found");
		}

		const shareSlug = Math.random().toString(36).slice(2, 12);
		const publicShareUrl = `/share/inspire/${shareSlug}`;
		await prisma.inspireOffer.update({
			where: { id: offerId },
			data: { shareUrl: publicShareUrl },
		});

		revalidatePath("/inspire/offers");
		revalidatePath("/inspire");
		return shareSlug;
	} catch (error) {
		console.error("Failed to update Inspire share URL", error);
		throw new Error("Unable to update the share URL right now. Please ensure the Inspire tables exist on this server.");
	}
}
