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
 * Copies a trip's core details and itinerary segments onto a new trip for
 * a different (or the same) client — e.g. two clients booking the same
 * cruise. Confirmation numbers are cleared since they're unique per
 * booking and would otherwise be misleading on the copy. Tasks, quotes,
 * payments, and documents are intentionally left behind — they're specific
 * to the original client's booking.
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function duplicateTrip(tripId, prevState, formData) {
  const user = await requireUser();
  const targetClientId = formData.get("clientId");
  if (typeof targetClientId !== "string" || !targetClientId) return "Please select a client.";

  const source = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { segments: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!source) return "Trip not found.";

  const newTrip = await prisma.trip.create({
    data: {
      clientId: targetClientId,
      name: source.name,
      destination: source.destination,
      startDate: source.startDate,
      endDate: source.endDate,
      status: "INQUIRY",
      totalPrice: source.totalPrice,
      segments: {
        create: source.segments.map((s) => ({
          type: s.type,
          title: s.title,
          supplierId: s.supplierId,
          confirmationNumber: null,
          startDateTime: s.startDateTime,
          endDateTime: s.endDateTime,
          location: s.location,
          cost: s.cost,
          notes: s.notes,
          details: s.details ?? undefined,
          sortOrder: s.sortOrder,
        })),
      },
    },
  });

  await logActivity({
    entityType: "Trip",
    entityId: newTrip.id,
    action: "created",
    description: `Trip "${newTrip.name}" duplicated from "${source.name}"`,
    userId: user.id,
    clientId: targetClientId,
  });

  revalidatePath("/trips");
  revalidatePath(`/clients/${targetClientId}/trips`);
  redirect(`/trips/${newTrip.id}`);
}

/**
 * Links an additional client (household) to a trip beyond its primary
 * client — e.g. two families booking the same cruise together.
 * @param {string} tripId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function addTripClient(tripId, prevState, formData) {
  const user = await requireUser();
  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !clientId) return "Please select a client.";

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
  if (!trip) return "Trip not found.";
  if (trip.clientId === clientId) return "This client is already the primary client on this trip.";

  const existing = await prisma.tripClient.findUnique({
    where: { tripId_clientId: { tripId, clientId } },
  });
  if (existing) return "This client is already on this trip.";

  await prisma.tripClient.create({ data: { tripId, clientId } });

  await logActivity({
    entityType: "Trip",
    entityId: tripId,
    action: "updated",
    description: `Client added to "${trip.name}"`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/clients/${clientId}/trips`);
}

/**
 * @param {string} tripClientId
 * @param {string} tripId
 */
export async function removeTripClient(tripClientId, tripId) {
  await requireUser();
  const tripClient = await prisma.tripClient.findFirst({ where: { id: tripClientId, tripId } });
  if (!tripClient) return;

  await prisma.tripClient.delete({ where: { id: tripClientId } });

  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/clients/${tripClient.clientId}/trips`);
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
