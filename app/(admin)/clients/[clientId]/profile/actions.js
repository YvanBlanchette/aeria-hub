"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

function readLoyaltyFields(formData) {
  const get = (name) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  return {
    programName: get("programName"),
    memberNumber: get("memberNumber"),
    notes: get("notes"),
  };
}

/**
 * @param {string} clientId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createLoyaltyProgram(clientId, prevState, formData) {
  const user = await requireUser();
  const fields = readLoyaltyFields(formData);
  if (!fields.programName || !fields.memberNumber) {
    return "Program name and member number are required.";
  }

  await prisma.loyaltyProgram.create({ data: { ...fields, clientId } });

  await logActivity({
    entityType: "LoyaltyProgram",
    entityId: clientId,
    action: "created",
    description: `Loyalty program "${fields.programName}" added`,
    userId: user.id,
    clientId,
  });

  revalidatePath(`/clients/${clientId}/profile`);
}

/**
 * @param {string} loyaltyProgramId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateLoyaltyProgram(loyaltyProgramId, prevState, formData) {
  const user = await requireUser();
  const fields = readLoyaltyFields(formData);
  if (!fields.programName || !fields.memberNumber) {
    return "Program name and member number are required.";
  }

  const program = await prisma.loyaltyProgram.update({
    where: { id: loyaltyProgramId },
    data: fields,
  });

  await logActivity({
    entityType: "LoyaltyProgram",
    entityId: loyaltyProgramId,
    action: "updated",
    description: `Loyalty program "${program.programName}" updated`,
    userId: user.id,
    clientId: program.clientId,
  });

  revalidatePath(`/clients/${program.clientId}/profile`);
}

/**
 * @param {string} loyaltyProgramId
 * @param {string} clientId
 */
export async function deleteLoyaltyProgram(loyaltyProgramId, clientId) {
  await requireUser();
  const program = await prisma.loyaltyProgram.findFirst({ where: { id: loyaltyProgramId, clientId } });
  if (!program) return;
  await prisma.loyaltyProgram.delete({ where: { id: loyaltyProgramId } });
  revalidatePath(`/clients/${clientId}/profile`);
}
