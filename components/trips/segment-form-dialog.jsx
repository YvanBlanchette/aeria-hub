"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSegment, updateSegment } from "@/app/(admin)/trips/[tripId]/itinerary/actions";
import { SEGMENT_TYPES, SEGMENT_DETAIL_FIELDS } from "@/lib/trip-segments";
import { dateTimeInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SegmentFormDialog({ tripId, segment, trigger }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(segment?.type || "FLIGHT");
  const action = segment ? updateSegment.bind(null, segment.id) : createSegment.bind(null, tripId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  const detailFields = SEGMENT_DETAIL_FIELDS[type] || [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setType(segment?.type || "FLIGHT");
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="size-4" />
            Add segment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{segment ? "Edit segment" : "Add segment"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <Icon className="size-4" />
                      {t.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={segment?.title}
              placeholder="Flight to Paris, Marriott Downtown..."
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDateTime">Start</Label>
              <Input
                id="startDateTime"
                name="startDateTime"
                type="datetime-local"
                defaultValue={dateTimeInputValue(segment?.startDateTime)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDateTime">End</Label>
              <Input
                id="endDateTime"
                name="endDateTime"
                type="datetime-local"
                defaultValue={dateTimeInputValue(segment?.endDateTime)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                name="provider"
                defaultValue={segment?.provider ?? ""}
                placeholder="Air France, Marriott, Royal Caribbean..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmationNumber">Confirmation #</Label>
              <Input id="confirmationNumber" name="confirmationNumber" defaultValue={segment?.confirmationNumber ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={segment?.location ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" name="cost" type="number" step="0.01" min="0" defaultValue={segment?.cost ?? ""} />
            </div>
          </div>

          {detailFields.length > 0 && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {detailFields.map((field) => (
                  <div key={field.key} className={cn("space-y-2", field.type === "textarea" && "sm:col-span-2")}>
                    <Label htmlFor={`detail_${field.key}`}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        rows={2}
                        placeholder={field.placeholder}
                        defaultValue={segment?.details?.[field.key] ?? ""}
                      />
                    ) : (
                      <Input
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        defaultValue={segment?.details?.[field.key] ?? ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={segment?.notes ?? ""} />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : segment ? "Save changes" : "Add segment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
