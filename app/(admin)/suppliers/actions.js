"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { SUPPLIER_CATEGORY_MAP } from "@/lib/suppliers";

function readSupplierFields(formData) {
  const get = (name) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  return {
    name: get("name"),
    category: SUPPLIER_CATEGORY_MAP[get("category")] ? get("category") : "OTHER",
    phone: get("phone"),
    website: get("website"),
    agentPortalUrl: get("agentPortalUrl"),
    notes: get("notes"),
  };
}

/**
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function createSupplier(prevState, formData) {
  const user = await requireUser();
  const fields = readSupplierFields(formData);
  if (!fields.name) return "Name is required.";

  const supplier = await prisma.supplier.create({ data: fields });

  await logActivity({
    entityType: "Supplier",
    entityId: supplier.id,
    action: "created",
    description: `Supplier "${supplier.name}" created`,
    userId: user.id,
  });

  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

/**
 * @param {string} supplierId
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function updateSupplier(supplierId, prevState, formData) {
  const user = await requireUser();
  const fields = readSupplierFields(formData);
  if (!fields.name) return "Name is required.";

  await prisma.supplier.update({ where: { id: supplierId }, data: fields });

  await logActivity({
    entityType: "Supplier",
    entityId: supplierId,
    action: "updated",
    description: "Supplier updated",
    userId: user.id,
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
}

/** @param {string} supplierId */
export async function deleteSupplier(supplierId) {
  const user = await requireUser();
  const supplier = await prisma.supplier.delete({ where: { id: supplierId } });

  await logActivity({
    entityType: "Supplier",
    entityId: supplierId,
    action: "deleted",
    description: `Supplier "${supplier.name}" deleted`,
    userId: user.id,
  });

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
