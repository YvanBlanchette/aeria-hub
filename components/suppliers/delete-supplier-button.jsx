"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteSupplier } from "@/app/(admin)/suppliers/actions";

export function DeleteSupplierButton({ supplierId, supplierName }) {
  return (
    <ConfirmDeleteButton
      itemLabel={supplierName}
      description="This removes the supplier. Segments booked through it keep their booking details but are no longer linked to a supplier record."
      onConfirm={() => deleteSupplier(supplierId)}
    />
  );
}
