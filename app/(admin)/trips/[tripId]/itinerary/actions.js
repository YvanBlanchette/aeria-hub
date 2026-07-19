"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { SEGMENT_DETAIL_FIELDS, SEGMENT_TYPE_MAP } from "@/lib/trip-segments";
import { parseLocalDateTime, dollarsToCents } from "@/lib/format";

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

  return {
    type,
    title: get("title"),
    provider: get("provider"),
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
  const user = await requireUser();
  const fields = readSegmentFields(formData);
  if (!fields.title) return "Title is required.";
  if (fields.startDateTime && fields.endDateTime && fields.endDateTime < fields.startDateTime) {
    return "End can't be before the start.";
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { clientId: true, name: true } });
  if (!trip) return "Trip not found.";

  const segment = await prisma.tripSegment.create({ data: { ...fields, tripId } });

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
  const user = await requireUser();
  const fields = readSegmentFields(formData);
  if (!fields.title) return "Title is required.";
  if (fields.startDateTime && fields.endDateTime && fields.endDateTime < fields.startDateTime) {
    return "End can't be before the start.";
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
  await requireUser();
  const existing = await prisma.tripSegment.findFirst({ where: { id: segmentId, tripId } });
  if (!existing) return;
  await prisma.tripSegment.delete({ where: { id: segmentId } });
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}/overview`);
}
