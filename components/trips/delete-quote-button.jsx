"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteQuote } from "@/app/(admin)/trips/[tripId]/quotes/actions";

export function DeleteQuoteButton({ quoteId, tripId, quoteTitle }) {
  return <ConfirmDeleteButton itemLabel={quoteTitle} onConfirm={() => deleteQuote(quoteId, tripId)} />;
}
