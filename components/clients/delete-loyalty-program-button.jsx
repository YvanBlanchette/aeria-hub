"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteLoyaltyProgram } from "@/app/(admin)/clients/[clientId]/profile/actions";

export function DeleteLoyaltyProgramButton({ loyaltyProgramId, clientId, programName }) {
  return (
    <ConfirmDeleteButton
      itemLabel={programName}
      onConfirm={() => deleteLoyaltyProgram(loyaltyProgramId, clientId)}
    />
  );
}
