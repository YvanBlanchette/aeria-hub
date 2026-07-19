"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteTraveler } from "@/app/(admin)/clients/[clientId]/travelers/actions";

export function DeleteTravelerButton({ travelerId, clientId, travelerName }) {
  return (
    <ConfirmDeleteButton
      itemLabel={travelerName}
      onConfirm={() => deleteTraveler(travelerId, clientId)}
    />
  );
}
