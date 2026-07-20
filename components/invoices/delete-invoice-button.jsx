"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteInvoice } from "@/app/(admin)/invoices/actions";

export function DeleteInvoiceButton({ invoiceId, clientId, invoiceNumber }) {
  return (
    <ConfirmDeleteButton
      itemLabel={invoiceNumber}
      description="This permanently removes the invoice and its line items."
      onConfirm={() => deleteInvoice(invoiceId, clientId)}
    />
  );
}
