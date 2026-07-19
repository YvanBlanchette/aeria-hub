"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { uploadDocument } from "@/app/(admin)/clients/[clientId]/documents/actions";

const documentTypes = [
  { value: "PASSPORT", label: "Passport" },
  { value: "VISA", label: "Visa" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "TICKET", label: "Ticket" },
  { value: "OTHER", label: "Other" },
];

export function DocumentUploadDialog({ clientId, travelers }) {
  const [open, setOpen] = useState(false);
  const action = uploadDocument.bind(null, clientId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" required />
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, HEIC, or PDF. Max 10MB.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="OTHER">
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {travelers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="travelerId">Belongs to</Label>
              <Select name="travelerId" defaultValue="none">
                <SelectTrigger id="travelerId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Client (household)</SelectItem>
                  {travelers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry date (optional)</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
