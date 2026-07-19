"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { dollarsToCents } from "@/lib/format";

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createQuote(tripId, prevState, formData) {
  const user = await requireUser();
  const title = formData.get("title");
  const validUntil = formData.get("validUntil");
  const notes = formData.get("notes");

  if (typeof title !== "string" || !title.trim()) {
    return "Title is required.";
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
  if (!trip) return "Trip not found.";

  const quote = await prisma.quote.create({
    data: {
      tripId,
      title: title.trim(),
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
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

  revalidatePath(`/trips/${tripId}/quotes`);
}

/**
 * @param {string} quoteId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateQuote(quoteId, prevState, formData) {
  const user = await requireUser();
  const title = formData.get("title");
  const validUntil = formData.get("validUntil");
  const notes = formData.get("notes");
  const status = formData.get("status") || "DRAFT";

  if (typeof title !== "string" || !title.trim()) {
    return "Title is required.";
  }

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      title: title.trim(),
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      status,
    },
    include: { trip: { select: { id: true, clientId: true, name: true } } },
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    action: "updated",
    description: `Quote "${quote.title}" updated`,
    userId: user.id,
    clientId: quote.trip.clientId,
  });

  revalidatePath(`/trips/${quote.trip.id}/quotes`);
}

/**
 * @param {string} quoteId
 * @param {string} tripId
 */
export async function deleteQuote(quoteId, tripId) {
  await requireUser();
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, tripId } });
  if (!quote) return;
  await prisma.quote.delete({ where: { id: quoteId } });
  revalidatePath(`/trips/${tripId}/quotes`);
}

/**
 * @param {string} quoteId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createLineItem(quoteId, prevState, formData) {
  await requireUser();
  const description = formData.get("description");
  const quantity = Number(formData.get("quantity"));
  const unitPrice = dollarsToCents(formData.get("unitPrice"));

  if (typeof description !== "string" || !description.trim()) {
    return "Description is required.";
  }
  if (unitPrice == null || unitPrice < 0) {
    return "Enter a valid unit price.";
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { tripId: true } });
  if (!quote) return "Quote not found.";

  const maxSort = await prisma.quoteLineItem.aggregate({ where: { quoteId }, _max: { sortOrder: true } });
  await prisma.quoteLineItem.create({
    data: {
      quoteId,
      description: description.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      unitPrice,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath(`/trips/${quote.tripId}/quotes`);
}

/**
 * @param {string} lineItemId
 * @param {string} quoteId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateLineItem(lineItemId, quoteId, prevState, formData) {
  await requireUser();
  const description = formData.get("description");
  const quantity = Number(formData.get("quantity"));
  const unitPrice = dollarsToCents(formData.get("unitPrice"));

  if (typeof description !== "string" || !description.trim()) {
    return "Description is required.";
  }
  if (unitPrice == null || unitPrice < 0) {
    return "Enter a valid unit price.";
  }

  const existing = await prisma.quoteLineItem.findFirst({
    where: { id: lineItemId, quoteId },
    include: { quote: { select: { tripId: true } } },
  });
  if (!existing) return "Line item not found.";

  await prisma.quoteLineItem.update({
    where: { id: lineItemId },
    data: {
      description: description.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      unitPrice,
    },
  });

  revalidatePath(`/trips/${existing.quote.tripId}/quotes`);
}

/**
 * @param {string} lineItemId
 * @param {string} quoteId
 */
export async function deleteLineItem(lineItemId, quoteId) {
  await requireUser();
  const existing = await prisma.quoteLineItem.findFirst({
    where: { id: lineItemId, quoteId },
    include: { quote: { select: { tripId: true } } },
  });
  if (!existing) return;

  await prisma.quoteLineItem.delete({ where: { id: lineItemId } });
  revalidatePath(`/trips/${existing.quote.tripId}/quotes`);
}
