"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setSegmentCommission } from "@/app/(admin)/trips/[tripId]/itinerary/actions";
import { centsToDollarsInputValue } from "@/lib/format";

/**
 * @param {{ segmentId: string, totalAmount?: number, isSplit?: boolean, trigger?: React.ReactNode }} props
 */
export function CommissionFormDialog({ segmentId, totalAmount, isSplit, trigger }) {
  const [open, setOpen] = useState(false);
  const action = setSegmentCommission.bind(null, segmentId);
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
          <Button variant="ghost" size="icon-sm">
            <Percent className="size-4" />
            <span className="sr-only">Set commission</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{totalAmount != null ? "Edit commission" : "Set commission"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Total commission amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={centsToDollarsInputValue(totalAmount)}
              required
            />
          </div>
          {isSplit && (
            <p className="text-xs text-muted-foreground">
              This is an Exoticca circuit — the total splits automatically into 60% due at booking and 40% due at
              the client's return.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
