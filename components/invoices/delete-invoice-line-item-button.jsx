"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteInvoiceLineItem } from "@/app/(admin)/invoices/actions";

export function DeleteInvoiceLineItemButton({ lineItemId, invoiceId, itemLabel }) {
  return (
    <ConfirmDeleteButton itemLabel={itemLabel} onConfirm={() => deleteInvoiceLineItem(lineItemId, invoiceId)} />
  );
}
