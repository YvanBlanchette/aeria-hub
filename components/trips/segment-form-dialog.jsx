"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { dateTimeInputValue, centsToDollarsInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import cruiseVendorsData from "@/data/cruise-vendors.json";
import cruiseShipsData from "@/data/cruise-ships.json";
import cruisePortsData from "@/data/cruise-ports.json";

const cruiseLineOptions = toCruiseOptions(cruiseVendorsData?.v).filter((option) => option.value);
const cruiseShipOptions = toCruiseOptions(cruiseShipsData?.s).filter((option) => option.value);
const cruisePortOptions = toCruiseOptions(cruisePortsData?.p).filter((option) => option.value);

const CRUISE_LINE_SHIP_TERMS = {
  "AmaWaterways": ["ama"],
  "Azamara": ["azamara"],
  "Carnival Cruise Line": ["carnival"],
  "Celebrity Cruises": ["celebrity", "flora", "xcel"],
  "Celebrity River": ["celebrity"],
  "Celestyal Cruises": ["celestyal"],
  "Costa Cruise Lines": ["costa"],
  "Cunard": ["queen anne", "queen elizabeth", "queen mary", "queen victoria"],
  "Disney Cruise Line": ["disney"],
  "Holland America Line": ["eurodam", "koningsdam", "nieuw", "noordam", "oosterdam", "rotterdam", "volendam", "westerdam", "zaandam", "zuiderdam"],
  "HX Expeditions": ["fram", "fridtjof", "maud", "otto sverdrup", "roald amundsen", "spitsbergen", "trollfjord"],
  "MSC Cruises": ["msc"],
  "Norwegian Cruise Line": ["norwegian", "pride of america"],
  "Princess Cruises": ["princess"],
  "Royal Caribbean International": ["of the seas"],
  "Seabourn Cruise Line": ["seabourn"],
  "Silversea Cruises": ["silver"],
  "Virgin Voyages": ["lady"],
  "Avalon Waterways River Cruises": ["avalon"],
};

function toCruiseOptions(group) {
  return Object.values(group || {})
    .map((item) => ({
      id: item.id,
      value: item.text || item.value,
      label: item.text || item.value,
      sourceValue: item.value,
    }))
    .filter((item) => item.value && item.label)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function matchesCruiseLine(ship, cruiseLine) {
  if (!cruiseLine) return true;
  const terms = CRUISE_LINE_SHIP_TERMS[cruiseLine] || [];
  if (terms.length === 0) return false;
  const label = ship.label.toLowerCase();
  return terms.some((term) => label.includes(term));
}

export function SegmentFormDialog({ tripId, segment, suppliers = [], trigger }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(segment?.type || "FLIGHT");
  const [supplierId, setSupplierId] = useState(segment?.supplierId || "none");
  const [cruiseDetails, setCruiseDetails] = useState({
    cruiseLine: segment?.details?.cruiseLine || "",
    shipName: segment?.details?.shipName || "",
    departurePort: segment?.details?.departurePort || "",
    arrivalPort: segment?.details?.arrivalPort || "",
  });
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
  const filteredCruiseShipOptions = useMemo(() => {
    return cruiseShipOptions.filter((ship) => matchesCruiseLine(ship, cruiseDetails.cruiseLine));
  }, [cruiseDetails.cruiseLine]);

  function updateCruiseDetail(key, value) {
    setCruiseDetails((current) => {
      const next = { ...current, [key]: value };
      if (key === "cruiseLine" && current.cruiseLine !== value) {
        next.shipName = "";
      }
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setType(segment?.type || "FLIGHT");
          setSupplierId(segment?.supplierId || "none");
          setCruiseDetails({
            cruiseLine: segment?.details?.cruiseLine || "",
            shipName: segment?.details?.shipName || "",
            departurePort: segment?.details?.departurePort || "",
            arrivalPort: segment?.details?.arrivalPort || "",
          });
        }
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
              <Label htmlFor="supplierId">Supplier</Label>
              <Select name="supplierId" value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplierId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Input id="cost" name="cost" type="number" step="0.01" min="0" defaultValue={centsToDollarsInputValue(segment?.cost)} />
            </div>
          </div>

          {detailFields.length > 0 && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {detailFields.map((field) => (
                  <div key={field.key} className={cn("space-y-2", field.type === "textarea" && "sm:col-span-2")}>
                    <Label htmlFor={`detail_${field.key}`}>{field.label}</Label>
                    {type === "CRUISE" && field.key === "cruiseLine" ? (
                      <CruiseSearchSelect
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        value={cruiseDetails.cruiseLine}
                        onValueChange={(value) => updateCruiseDetail("cruiseLine", value)}
                        options={cruiseLineOptions}
                        placeholder="Select a cruise line"
                        searchPlaceholder="Search cruise lines..."
                        emptyMessage="No cruise line found."
                      />
                    ) : type === "CRUISE" && field.key === "shipName" ? (
                      <CruiseSearchSelect
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        value={cruiseDetails.shipName}
                        onValueChange={(value) => updateCruiseDetail("shipName", value)}
                        options={filteredCruiseShipOptions}
                        placeholder={cruiseDetails.cruiseLine ? "Select a cruise ship" : "Select a cruise line first"}
                        searchPlaceholder="Search cruise ships..."
                        emptyMessage={cruiseDetails.cruiseLine ? "No ship found for this cruise line." : "Select a cruise line first."}
                        disabled={!cruiseDetails.cruiseLine}
                      />
                    ) : type === "CRUISE" && field.key === "departurePort" ? (
                      <CruiseSearchSelect
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        value={cruiseDetails.departurePort}
                        onValueChange={(value) => updateCruiseDetail("departurePort", value)}
                        options={cruisePortOptions}
                        placeholder="Select a departure port"
                        searchPlaceholder="Search ports..."
                        emptyMessage="No port found."
                      />
                    ) : type === "CRUISE" && field.key === "arrivalPort" ? (
                      <CruiseSearchSelect
                        id={`detail_${field.key}`}
                        name={`detail_${field.key}`}
                        value={cruiseDetails.arrivalPort}
                        onValueChange={(value) => updateCruiseDetail("arrivalPort", value)}
                        options={cruisePortOptions}
                        placeholder="Select an arrival port"
                        searchPlaceholder="Search ports..."
                        emptyMessage="No port found."
                      />
                    ) : field.type === "textarea" ? (
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

function CruiseSearchSelect({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  const filtered = useMemo(() => {
    const list = Array.isArray(options) ? options : [];
    if (!query.trim()) return list.slice(0, 120);
    const q = query.trim().toLowerCase();
    return list.filter((option) => option.label.toLowerCase().includes(q)).slice(0, 120);
  }, [options, query]);

  return (
    <>
      <input type="hidden" name={name} value={value || ""} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!disabled) setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-8 w-full justify-between rounded-lg border-input bg-transparent px-3 py-1 text-sm font-normal"
          >
            <span className={cn("truncate text-left", !value && "text-muted-foreground")}>{selected?.label || value || placeholder}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) rounded-xl border-border/70 p-0 shadow-xl">
          <div className="p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1 pt-0">
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60"
              >
                Clear selection
              </button>
            ) : null}
            {filtered.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p> : null}
            {filtered.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.id || option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60", isSelected && "bg-muted/70")}
                >
                  <Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
