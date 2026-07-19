"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { SEGMENT_DETAIL_FIELDS, SEGMENT_TYPE_MAP, groupSegmentsByDay } from "@/lib/trip-segments";
import { parseLocalDateTime, dollarsToCents } from "@/lib/format";
import { validateUploadedFile, saveUploadedFile, deleteStoredFile } from "@/lib/documents";

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

  const maxSort = await prisma.tripSegment.aggregate({ where: { tripId }, _max: { sortOrder: true } });
  const segment = await prisma.tripSegment.create({
    data: { ...fields, tripId, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  });

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

/**
 * Swaps a segment's sortOrder with its neighbor within the same day (or the
 * Unscheduled bucket) — moving further isn't possible across day boundaries,
 * since each day is its own independently-ordered list.
 * @param {string} segmentId
 * @param {string} tripId
 * @param {"up" | "down"} direction
 */
export async function reorderSegment(segmentId, tripId, direction) {
  await requireUser();

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { startDate: true, endDate: true } });
  if (!trip) return;

  const segments = await prisma.tripSegment.findMany({
    where: { tripId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const { days, unscheduled } = groupSegmentsByDay(segments, trip);
  const groups = [...days.map((d) => d.segments), unscheduled];

  for (const group of groups) {
    const index = group.findIndex((s) => s.id === segmentId);
    if (index === -1) continue;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= group.length) return;

    const current = group[index];
    const neighbor = group[swapIndex];
    await prisma.$transaction([
      prisma.tripSegment.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
      prisma.tripSegment.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
    ]);
    break;
  }

  revalidatePath(`/trips/${tripId}/itinerary`);
}

/**
 * Uploads a document (ticket, voucher, confirmation...) linked directly to
 * a segment. The client link is derived from the segment's trip — never
 * trusted from the client — so it also shows up on that client's
 * Documents tab.
 * @param {string} segmentId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function uploadSegmentDocument(segmentId, prevState, formData) {
  const user = await requireUser();
  const file = formData.get("file");
  const type = formData.get("type") || "TICKET";

  const validationError = validateUploadedFile(file);
  if (validationError) return validationError;

  const segment = await prisma.tripSegment.findUnique({
    where: { id: segmentId },
    include: { trip: { select: { id: true, clientId: true, name: true } } },
  });
  if (!segment) return "Segment not found.";

  const saved = await saveUploadedFile(segment.trip.clientId, file);

  await prisma.document.create({
    data: {
      clientId: segment.trip.clientId,
      segmentId,
      type,
      ...saved,
    },
  });

  await logActivity({
    entityType: "Document",
    entityId: segmentId,
    action: "created",
    description: `Document "${file.name}" uploaded to "${segment.title}" (${segment.trip.name})`,
    userId: user.id,
    clientId: segment.trip.clientId,
  });

  revalidatePath(`/trips/${segment.trip.id}/itinerary`);
  revalidatePath(`/clients/${segment.trip.clientId}/documents`);
}

/**
 * @param {string} documentId
 * @param {string} segmentId
 * @param {string} tripId
 */
export async function deleteSegmentDocument(documentId, segmentId, tripId) {
  await requireUser();
  const document = await prisma.document.findFirst({ where: { id: documentId, segmentId } });
  if (!document) return;

  await prisma.document.delete({ where: { id: documentId } });
  await deleteStoredFile(document.storagePath);

  revalidatePath(`/trips/${tripId}/itinerary`);
  if (document.clientId) {
    revalidatePath(`/clients/${document.clientId}/documents`);
  }
}
