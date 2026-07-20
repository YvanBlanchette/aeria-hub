"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setCommissionReceived } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function CommissionReceivedToggle({ portion }) {
  const [isPending, startTransition] = useTransition();
  const received = portion.status === "RECEIVED";
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => setCommissionReceived(portion.id, !received))}
    >
      {received ? "Mark pending" : "Mark received"}
    </Button>
  );
}
