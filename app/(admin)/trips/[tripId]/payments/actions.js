"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
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

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createPayment(tripId, prevState, formData) {
  const user = await requireUser();
  const fields = readPaymentFields(formData);

  if (fields.amount == null || fields.amount < 0) return "Enter a valid payment amount.";
  if (!fields.paymentDate) return "Payment date is required.";

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
  if (!trip) return "Trip not found.";

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
}

/**
 * @param {string} paymentId
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updatePayment(paymentId, tripId, prevState, formData) {
  await requireUser();
  const fields = readPaymentFields(formData);

  if (fields.amount == null || fields.amount < 0) return "Enter a valid payment amount.";
  if (!fields.paymentDate) return "Payment date is required.";

  const existing = await prisma.tripPayment.findFirst({ where: { id: paymentId, tripId } });
  if (!existing) return "Payment not found.";

  await prisma.tripPayment.update({ where: { id: paymentId }, data: fields });

  revalidatePath(`/trips/${tripId}/payments`);
  revalidatePath(`/trips/${tripId}/overview`);
}

/**
 * @param {string} paymentId
 * @param {string} tripId
 * @param {boolean} cancelled
 */
export async function setPaymentCancelled(paymentId, tripId, cancelled) {
  await requireUser();
  const existing = await prisma.tripPayment.findFirst({ where: { id: paymentId, tripId } });
  if (!existing) return;

  await prisma.tripPayment.update({ where: { id: paymentId }, data: { cancelled } });

  revalidatePath(`/trips/${tripId}/payments`);
  revalidatePath(`/trips/${tripId}/overview`);
}
