"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteSegmentCommission } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function DeleteCommissionButton({ segmentId, tripId }) {
  return (
    <ConfirmDeleteButton
      itemLabel="this commission"
      description="This removes all commission portions for this segment, including any already marked received."
      onConfirm={() => deleteSegmentCommission(segmentId, tripId)}
    />
  );
}
