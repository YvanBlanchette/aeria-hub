"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteLineItem } from "@/app/(admin)/trips/[tripId]/quotes/actions";

export function DeleteLineItemButton({ lineItemId, quoteId, itemLabel }) {
  return <ConfirmDeleteButton itemLabel={itemLabel} onConfirm={() => deleteLineItem(lineItemId, quoteId)} />;
}
