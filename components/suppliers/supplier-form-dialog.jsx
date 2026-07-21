"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSupplier, updateSupplier } from "@/app/(admin)/suppliers/actions";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers";

export function SupplierFormDialog({ supplier, trigger }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(supplier?.category || "OTHER");
  const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier;
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setCategory(supplier?.category || "OTHER");
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="size-4" />
            New Supplier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "New supplier"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Air Canada, Royal Caribbean, Exoticca..."
              defaultValue={supplier?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <SelectItem key={c.value} value={c.value}>
                      <Icon className="size-4" />
                      {c.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={supplier?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Public website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://..."
                defaultValue={supplier?.website ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agentPortalUrl">Agent platform URL</Label>
              <Input
                id="agentPortalUrl"
                name="agentPortalUrl"
                type="url"
                placeholder="https://agent.example.com..."
                defaultValue={supplier?.agentPortalUrl ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={supplier?.notes ?? ""} />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : supplier ? "Save changes" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
