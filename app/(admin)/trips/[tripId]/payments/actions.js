"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTripStaffAccess } from "@/lib/trip-access";
import { logActivity } from "@/lib/activity";
import { tServer } from "@/lib/i18n-server";
import { dollarsToCents } from "@/lib/format";

function readPaymentFields(formData) {
	const get = (name) => {
		const value = formData.get(name);
		return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	};
	const type = get("type") === "FUTURE_CRUISE_CREDIT" ? "FUTURE_CRUISE_CREDIT" : "CC_TO_SUPPLIER";
	const paymentDate = get("paymentDate");

	return {
		type,
		cardHolder: get("cardHolder"),
		cardNumber: get("cardNumber"),
		confirmationNumber: get("confirmationNumber"),
		amount: dollarsToCents(get("amount")),
		paymentDate: paymentDate ? new Date(paymentDate) : null,
		paidTo: get("paidTo"),
		comments: get("comments"),
	};
}

async function revalidateTripInvoiceViews(tripId, clientId) {
	const invoices = await prisma.invoice.findMany({ where: { tripId }, select: { id: true, clientId: true } });
	for (const invoice of invoices) {
		revalidatePath(`/invoices/${invoice.id}`);
	}
	revalidatePath("/invoices");
	if (clientId) revalidatePath(`/clients/${clientId}/invoices`);
}

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createPayment(tripId, prevState, formData) {
	const t = tServer;
	const { user } = await requireTripStaffAccess(tripId);
	const fields = readPaymentFields(formData);

	if (fields.amount == null || fields.amount < 0) return t("errors.validPaymentAmount", "Enter a valid payment amount.");
	if (!fields.paymentDate) return t("errors.requiredPaymentDate", "Payment date is required.");

	const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
	if (!trip) return t("errors.tripNotFound", "Trip not found.");

	await prisma.tripPayment.create({ data: { ...fields, tripId } });

	await logActivity({
		entityType: "TripPayment",
		entityId: tripId,
		action: "created",
		description: `Payment of ${(fields.amount / 100).toFixed(2)}$ added to "${trip.name}"`,
		userId: user.id,
		clientId: trip.clientId,
	});

	revalidatePath(`/trips/${tripId}/payments`);
	revalidatePath(`/trips/${tripId}/overview`);
	await revalidateTripInvoiceViews(tripId, trip.clientId);
}

/**
 * @param {string} paymentId
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updatePayment(paymentId, tripId, prevState, formData) {
	const t = tServer;
	await requireTripStaffAccess(tripId);
	const fields = readPaymentFields(formData);

	if (fields.amount == null || fields.amount < 0) return t("errors.validPaymentAmount", "Enter a valid payment amount.");
	if (!fields.paymentDate) return t("errors.requiredPaymentDate", "Payment date is required.");

	const existing = await prisma.tripPayment.findFirst({ where: { id: paymentId, tripId }, include: { trip: { select: { clientId: true } } } });
	if (!existing) return t("errors.paymentNotFound", "Payment not found.");

	await prisma.tripPayment.update({ where: { id: paymentId }, data: fields });

	revalidatePath(`/trips/${tripId}/payments`);
	revalidatePath(`/trips/${tripId}/overview`);
	await revalidateTripInvoiceViews(tripId, existing.trip.clientId);
}

/**
 * @param {string} paymentId
 * @param {string} tripId
 * @param {boolean} cancelled
 */
export async function setPaymentCancelled(paymentId, tripId, cancelled) {
	await requireTripStaffAccess(tripId);
	const existing = await prisma.tripPayment.findFirst({ where: { id: paymentId, tripId }, include: { trip: { select: { clientId: true } } } });
	if (!existing) return;

	await prisma.tripPayment.update({ where: { id: paymentId }, data: { cancelled } });

	revalidatePath(`/trips/${tripId}/payments`);
	revalidatePath(`/trips/${tripId}/overview`);
	await revalidateTripInvoiceViews(tripId, existing.trip.clientId);
}
