"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { parseCsv, rowsToObjects } from "@/lib/csv";
import { detectCsvFormat, mapRowToClient } from "@/lib/contacts-csv";

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
    primaryEmail: get("primaryEmail"),
    secondaryEmail: get("secondaryEmail"),
    primaryPhone: get("primaryPhone"),
    secondaryPhone: get("secondaryPhone"),
    address: get("address"),
    city: get("city"),
    stateProvince: get("stateProvince"),
    postalCode: get("postalCode"),
    country: get("country"),
    dateOfBirth: getDate("dateOfBirth"),
    passportNumber: get("passportNumber"),
    passportIssueDate: getDate("passportIssueDate"),
    passportExpiry: getDate("passportExpiry"),
    redressNumber: get("redressNumber"),
    knownTravelerNumber: get("knownTravelerNumber"),
    nationality: get("nationality"),
    travelPreferences: get("travelPreferences"),
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

/**
 * Imports clients from a Google Contacts or Outlook CSV export.
 * Rows with an email matching an existing client are skipped rather
 * than creating a duplicate.
 * @param {string | undefined} prevState
 * @param {FormData} formData
 * @returns {Promise<string | { created: number, skipped: number, errors: number, format: string }>}
 */
export async function importClientsCsv(prevState, formData) {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return "Please choose a CSV file to import.";
  }

  const text = await file.text();
  const rows = rowsToObjects(parseCsv(text));

  if (rows.length === 0) {
    return "That CSV file doesn't contain any contact rows.";
  }

  const format = detectCsvFormat(Object.keys(rows[0]));
  if (!format) {
    return "Couldn't recognize this as a Google Contacts or Outlook CSV export. Make sure you're uploading one of those export formats.";
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const fields = mapRowToClient(row, format);
    if (!fields || (!fields.firstName && !fields.lastName)) {
      skipped++;
      continue;
    }

    if (fields.primaryEmail) {
      const existing = await prisma.client.findFirst({
        where: { primaryEmail: fields.primaryEmail },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
    }

    const { note, ...clientFields } = fields;

    try {
      const client = await prisma.client.create({
        data: {
          ...clientFields,
          firstName: clientFields.firstName || "Unknown",
          lastName: clientFields.lastName || "",
        },
      });
      if (note) {
        await prisma.note.create({ data: { clientId: client.id, authorId: user.id, body: note } });
      }
      created++;
    } catch {
      errors++;
    }
  }

  await logActivity({
    entityType: "Import",
    entityId: "csv",
    action: "imported",
    description: `Imported ${created} client${created === 1 ? "" : "s"} from ${format === "google" ? "Google Contacts" : "Outlook"} CSV (${skipped} skipped, ${errors} errors)`,
    userId: user.id,
  });

  revalidatePath("/clients");
  return { created, skipped, errors, format };
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
