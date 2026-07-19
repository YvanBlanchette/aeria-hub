"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { dollarsToCents } from "@/lib/format";

function readTripFields(formData) {
  const get = (name) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  const getDate = (name) => {
    const value = get(name);
    return value ? new Date(value) : null;
  };

  return {
    clientId: get("clientId"),
    name: get("name"),
    destination: get("destination"),
    startDate: getDate("startDate"),
    endDate: getDate("endDate"),
    status: get("status") || "INQUIRY",
    totalPrice: dollarsToCents(get("totalPrice")),
    finalPaymentDate: getDate("finalPaymentDate"),
  };
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createTrip(prevState, formData) {
  const user = await requireUser();
  const { clientId, ...fields } = readTripFields(formData);

  if (!clientId) return "Please select a client.";
  if (!fields.name || !fields.destination) return "Trip name and destination are required.";
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return "End date can't be before the start date.";
  }

  const trip = await prisma.trip.create({ data: { ...fields, clientId } });

  await logActivity({
    entityType: "Trip",
    entityId: trip.id,
    action: "created",
    description: `Trip "${trip.name}" created`,
    userId: user.id,
    clientId,
  });

  revalidatePath("/trips");
  revalidatePath(`/clients/${clientId}/trips`);
  redirect(`/trips/${trip.id}`);
}

/**
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateTrip(tripId, prevState, formData) {
  const user = await requireUser();
  const { clientId, ...fields } = readTripFields(formData);

  if (!clientId) return "Please select a client.";
  if (!fields.name || !fields.destination) return "Trip name and destination are required.";
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return "End date can't be before the start date.";
  }

  const trip = await prisma.trip.update({ where: { id: tripId }, data: { ...fields, clientId } });

  await logActivity({
    entityType: "Trip",
    entityId: tripId,
    action: "updated",
    description: `Trip "${trip.name}" updated`,
    userId: user.id,
    clientId,
  });

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/clients/${clientId}/trips`);
  redirect(`/trips/${tripId}`);
}

/**
 * @param {string} tripId
 * @param {string} clientId
 */
export async function deleteTrip(tripId, clientId) {
  const user = await requireUser();
  const existing = await prisma.trip.findFirst({ where: { id: tripId, clientId } });
  if (!existing) return;
  const trip = await prisma.trip.delete({ where: { id: tripId } });

  await logActivity({
    entityType: "Trip",
    entityId: tripId,
    action: "deleted",
    description: `Trip "${trip.name}" deleted`,
    userId: user.id,
    clientId,
  });

  revalidatePath("/trips");
  revalidatePath(`/clients/${clientId}/trips`);
  redirect("/trips");
}
