"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

function readTravelerFields(formData) {
  const get = (name) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  const getDate = (name) => {
    const value = get(name);
    return value ? new Date(value) : null;
  };

  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    relationshipToClient: get("relationshipToClient"),
    dateOfBirth: getDate("dateOfBirth"),
    passportNumber: get("passportNumber"),
    passportExpiry: getDate("passportExpiry"),
    nationality: get("nationality"),
    dietaryNotes: get("dietaryNotes"),
    mobilityNotes: get("mobilityNotes"),
  };
}

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createTraveler(clientId, prevState, formData) {
  const user = await requireUser();
  const fields = readTravelerFields(formData);
  if (!fields.firstName || !fields.lastName) {
    return "First and last name are required.";
  }

  const traveler = await prisma.traveler.create({ data: { ...fields, clientId } });

  await logActivity({
    entityType: "Traveler",
    entityId: traveler.id,
    action: "created",
    description: `Traveler ${traveler.firstName} ${traveler.lastName} added`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/travelers`);
}

/**
 * @param {string} travelerId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateTraveler(travelerId, prevState, formData) {
  const user = await requireUser();
  const fields = readTravelerFields(formData);
  if (!fields.firstName || !fields.lastName) {
    return "First and last name are required.";
  }

  const traveler = await prisma.traveler.update({ where: { id: travelerId }, data: fields });

  await logActivity({
    entityType: "Traveler",
    entityId: travelerId,
    action: "updated",
    description: `Traveler ${traveler.firstName} ${traveler.lastName} updated`,
    userId: user.id,
    clientId: traveler.clientId,
  });

  revalidatePath(`/clients/${traveler.clientId}/travelers`);
}

/**
 * @param {string} travelerId
 * @param {string} clientId
 */
export async function deleteTraveler(travelerId, clientId) {
  const user = await requireUser();
  const traveler = await prisma.traveler.findFirst({ where: { id: travelerId, clientId } });
  if (!traveler) return;
  await prisma.traveler.delete({ where: { id: travelerId } });

  await logActivity({
    entityType: "Traveler",
    entityId: travelerId,
    action: "deleted",
    description: `Traveler ${traveler.firstName} ${traveler.lastName} removed`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/travelers`);
}
