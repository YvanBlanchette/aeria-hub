"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

function readClientFields(formData) {
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
    email: get("email"),
    phone: get("phone"),
    address: get("address"),
    city: get("city"),
    country: get("country"),
    dateOfBirth: getDate("dateOfBirth"),
    passportNumber: get("passportNumber"),
    passportExpiry: getDate("passportExpiry"),
    nationality: get("nationality"),
    travelPreferences: get("travelPreferences"),
    loyaltyPrograms: get("loyaltyPrograms"),
    dietaryNotes: get("dietaryNotes"),
    mobilityNotes: get("mobilityNotes"),
    status: get("status") || "active",
    assignedAgentId: get("assignedAgentId"),
  };
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createClient(prevState, formData) {
  const user = await requireUser();
  const fields = readClientFields(formData);

  if (!fields.firstName || !fields.lastName) {
    return "First and last name are required.";
  }

  const client = await prisma.client.create({ data: fields });

  await logActivity({
    entityType: "Client",
    entityId: client.id,
    action: "created",
    description: `Client ${client.firstName} ${client.lastName} created`,
    userId: user.id,
    clientId: client.id,
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateClient(clientId, prevState, formData) {
  const user = await requireUser();
  const fields = readClientFields(formData);

  if (!fields.firstName || !fields.lastName) {
    return "First and last name are required.";
  }

  await prisma.client.update({ where: { id: clientId }, data: fields });

  await logActivity({
    entityType: "Client",
    entityId: clientId,
    action: "updated",
    description: "Client profile updated",
    userId: user.id,
    clientId,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

/** @param {string} clientId */
export async function deleteClient(clientId) {
  const user = await requireUser();
  await prisma.client.delete({ where: { id: clientId } });

  await logActivity({
    entityType: "Client",
    entityId: clientId,
    action: "deleted",
    description: "Client deleted",
    userId: user.id,
  });

  revalidatePath("/clients");
  redirect("/clients");
}
