"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { createTraveler, updateTraveler } from "@/app/(admin)/clients/[clientId]/travelers/actions";

function dateInputValue(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function TravelerFormDialog({ clientId, traveler, trigger }) {
  const [open, setOpen] = useState(false);
  const action = traveler
    ? updateTraveler.bind(null, traveler.id)
    : createTraveler.bind(null, clientId);
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{traveler ? "Edit traveler" : "Add traveler"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={traveler?.firstName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={traveler?.lastName} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="relationshipToClient">Relationship to client</Label>
              <Input
                id="relationshipToClient"
                name="relationshipToClient"
                placeholder="Spouse, child, companion..."
                defaultValue={traveler?.relationshipToClient ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={dateInputValue(traveler?.dateOfBirth)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" defaultValue={traveler?.nationality ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNumber">Passport number</Label>
              <Input id="passportNumber" name="passportNumber" defaultValue={traveler?.passportNumber ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportExpiry">Passport expiry</Label>
              <Input
                id="passportExpiry"
                name="passportExpiry"
                type="date"
                defaultValue={dateInputValue(traveler?.passportExpiry)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dietaryNotes">Dietary notes</Label>
              <Textarea id="dietaryNotes" name="dietaryNotes" rows={2} defaultValue={traveler?.dietaryNotes ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobilityNotes">Mobility notes</Label>
              <Textarea id="mobilityNotes" name="mobilityNotes" rows={2} defaultValue={traveler?.mobilityNotes ?? ""} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : traveler ? "Save changes" : "Add traveler"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
