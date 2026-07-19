"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteSegment } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function DeleteSegmentButton({ segmentId, tripId, segmentTitle }) {
  return (
    <ConfirmDeleteButton itemLabel={segmentTitle} onConfirm={() => deleteSegment(segmentId, tripId)} />
  );
}
