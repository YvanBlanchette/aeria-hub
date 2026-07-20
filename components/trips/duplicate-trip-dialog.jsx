"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientPicker } from "@/components/trips/client-picker";
import { duplicateTrip } from "@/app/(admin)/trips/actions";

export function DuplicateTripDialog({ tripId, clients }) {
  const [open, setOpen] = useState(false);
  const action = duplicateTrip.bind(null, tripId);
  const [error, formAction, pending] = useActionState(action, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Copy className="size-4" />
          Duplicate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate trip</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copies the trip details and itinerary onto a new trip for the client you choose. Confirmation numbers
            aren't copied since they're unique per booking. Tasks, quotes, and payments start fresh.
          </p>
          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <ClientPicker clients={clients} name="clientId" />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Duplicating..." : "Duplicate trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
