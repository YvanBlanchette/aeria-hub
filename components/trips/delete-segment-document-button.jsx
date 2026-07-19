"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteSegmentDocument } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function DeleteSegmentDocumentButton({ documentId, segmentId, tripId, fileName }) {
  return (
    <ConfirmDeleteButton itemLabel={fileName} onConfirm={() => deleteSegmentDocument(documentId, segmentId, tripId)} />
  );
}
