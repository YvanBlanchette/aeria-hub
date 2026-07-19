"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLoyaltyProgram, updateLoyaltyProgram } from "@/app/(admin)/clients/[clientId]/profile/actions";

export function LoyaltyProgramFormDialog({ clientId, program, trigger }) {
  const [open, setOpen] = useState(false);
  const action = program
    ? updateLoyaltyProgram.bind(null, program.id)
    : createLoyaltyProgram.bind(null, clientId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="size-4" />
            Add loyalty program
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{program ? "Edit loyalty program" : "Add loyalty program"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="programName">Program name</Label>
            <Input
              id="programName"
              name="programName"
              placeholder="Delta SkyMiles, Marriott Bonvoy..."
              defaultValue={program?.programName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberNumber">Member number</Label>
            <Input id="memberNumber" name="memberNumber" defaultValue={program?.memberNumber} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Status tier, expiry, companion pass..."
              defaultValue={program?.notes ?? ""}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : program ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
