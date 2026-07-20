"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { dollarsToCents } from "@/lib/format";

async function nextInvoiceNumber() {
  const invoices = await prisma.invoice.findMany({ select: { invoiceNumber: true } });
  const maxNumber = invoices.reduce((max, inv) => {
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 1000);
  return `INV-${maxNumber + 1}`;
}

async function syncInvoiceAmount(invoiceId) {
  const lineItems = await prisma.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { quantity: true, unitPrice: true },
  });
  const amount = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { amount } });
}

/**
 * Creates an invoice from a trip's itinerary — one line item per segment,
 * using its title and cost.
 * @param {string} tripId
 */
export async function convertItineraryToInvoice(tripId) {
  const user = await requireUser();

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { segments: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!trip) return;

  const invoiceNumber = await nextInvoiceNumber();
  const invoice = await prisma.invoice.create({
    data: {
      clientId: trip.clientId,
      tripId: trip.id,
      invoiceNumber,
      dueDate: trip.finalPaymentDate,
      amount: 0,
      lineItems: {
        create: trip.segments.map((s, i) => ({
          description: s.title,
          quantity: 1,
          unitPrice: s.cost ?? 0,
          sortOrder: i,
        })),
      },
    },
  });

  await syncInvoiceAmount(invoice.id);

  await logActivity({
    entityType: "Invoice",
    entityId: invoice.id,
    action: "created",
    description: `Invoice ${invoiceNumber} generated from "${trip.name}" itinerary`,
    userId: user.id,
    clientId: trip.clientId,
  });

  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/clients/${trip.clientId}/invoices`);
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Creates an invoice from a quote's line items, copied as-is.
 * @param {string} quoteId
 */
export async function convertQuoteToInvoice(quoteId) {
  const user = await requireUser();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      trip: { select: { id: true, name: true, clientId: true, finalPaymentDate: true } },
    },
  });
  if (!quote) return;

  const invoiceNumber = await nextInvoiceNumber();
  const invoice = await prisma.invoice.create({
    data: {
      clientId: quote.trip.clientId,
      tripId: quote.trip.id,
      invoiceNumber,
      dueDate: quote.validUntil ?? quote.trip.finalPaymentDate,
      amount: 0,
      lineItems: {
        create: quote.lineItems.map((li, i) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          sortOrder: i,
        })),
      },
    },
  });

  await syncInvoiceAmount(invoice.id);

  await logActivity({
    entityType: "Invoice",
    entityId: invoice.id,
    action: "created",
    description: `Invoice ${invoiceNumber} generated from quote "${quote.title}"`,
    userId: user.id,
    clientId: quote.trip.clientId,
  });

  revalidatePath(`/trips/${quote.trip.id}/quotes`);
  revalidatePath(`/trips/${quote.trip.id}/overview`);
  revalidatePath(`/clients/${quote.trip.clientId}/invoices`);
  redirect(`/invoices/${invoice.id}`);
}

/**
 * @param {string} invoiceId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateInvoice(invoiceId, prevState, formData) {
  const user = await requireUser();
  const get = (name) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const status = get("status") || "DRAFT";
  const dueDateValue = get("dueDate");
  const dueDate = dueDateValue ? new Date(dueDateValue) : null;
  const amountPaid = dollarsToCents(get("amountPaid")) ?? 0;

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, dueDate, amountPaid },
  });

  await logActivity({
    entityType: "Invoice",
    entityId: invoiceId,
    action: "updated",
    description: `Invoice ${invoice.invoiceNumber} updated`,
    userId: user.id,
    clientId: invoice.clientId,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  if (invoice.tripId) revalidatePath(`/trips/${invoice.tripId}/overview`);
  revalidatePath(`/clients/${invoice.clientId}/invoices`);
}

/**
 * @param {string} invoiceId
 * @param {string} clientId
 */
export async function deleteInvoice(invoiceId, clientId) {
  await requireUser();
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, clientId } });
  if (!invoice) return;

  await prisma.invoice.delete({ where: { id: invoiceId } });

  revalidatePath(`/clients/${clientId}/invoices`);
  if (invoice.tripId) revalidatePath(`/trips/${invoice.tripId}/overview`);
  redirect(`/clients/${clientId}/invoices`);
}

/**
 * @param {string} invoiceId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createInvoiceLineItem(invoiceId, prevState, formData) {
  await requireUser();
  const description = formData.get("description");
  const quantity = Number(formData.get("quantity"));
  const unitPrice = dollarsToCents(formData.get("unitPrice"));

  if (typeof description !== "string" || !description.trim()) return "Description is required.";
  if (unitPrice == null || unitPrice < 0) return "Enter a valid unit price.";

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
  if (!invoice) return "Invoice not found.";

  const maxSort = await prisma.invoiceLineItem.aggregate({ where: { invoiceId }, _max: { sortOrder: true } });
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId,
      description: description.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      unitPrice,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await syncInvoiceAmount(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

/**
 * @param {string} lineItemId
 * @param {string} invoiceId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateInvoiceLineItem(lineItemId, invoiceId, prevState, formData) {
  await requireUser();
  const description = formData.get("description");
  const quantity = Number(formData.get("quantity"));
  const unitPrice = dollarsToCents(formData.get("unitPrice"));

  if (typeof description !== "string" || !description.trim()) return "Description is required.";
  if (unitPrice == null || unitPrice < 0) return "Enter a valid unit price.";

  const existing = await prisma.invoiceLineItem.findFirst({ where: { id: lineItemId, invoiceId } });
  if (!existing) return "Line item not found.";

  await prisma.invoiceLineItem.update({
    where: { id: lineItemId },
    data: {
      description: description.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
      unitPrice,
    },
  });

  await syncInvoiceAmount(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

/**
 * @param {string} lineItemId
 * @param {string} invoiceId
 */
export async function deleteInvoiceLineItem(lineItemId, invoiceId) {
  await requireUser();
  const existing = await prisma.invoiceLineItem.findFirst({ where: { id: lineItemId, invoiceId } });
  if (!existing) return;

  await prisma.invoiceLineItem.delete({ where: { id: lineItemId } });
  await syncInvoiceAmount(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}
