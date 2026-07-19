"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteTrip } from "@/app/(admin)/trips/actions";

export function DeleteTripButton({ tripId, clientId, tripName }) {
  return (
    <ConfirmDeleteButton
      itemLabel={tripName}
      description="This permanently removes the trip and all of its itinerary segments."
      onConfirm={() => deleteTrip(tripId, clientId)}
    />
  );
}
