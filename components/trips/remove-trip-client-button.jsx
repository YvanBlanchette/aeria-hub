"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeTripClient } from "@/app/(admin)/trips/actions";

export function RemoveTripClientButton({ tripClientId, tripId, clientName }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeTripClient(tripClientId, tripId))}
    >
      <X className="size-4" />
      <span className="sr-only">Remove {clientName} from trip</span>
    </Button>
  );
}
