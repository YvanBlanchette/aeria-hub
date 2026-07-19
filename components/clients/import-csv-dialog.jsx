"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importClientsCsv } from "@/app/(admin)/clients/actions";

export function ImportCsvDialog() {
  const [result, formAction, pending] = useActionState(importClientsCsv, undefined);
  const formRef = useRef(null);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) formRef.current?.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import clients from CSV</DialogTitle>
          <DialogDescription>
            Upload a Google Contacts or Outlook CSV export. Contacts whose email matches an
            existing client are skipped to avoid duplicates.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csvFile">CSV file</Label>
            <Input id="csvFile" name="file" type="file" accept=".csv,text/csv" required />
          </div>

          {typeof result === "string" && (
            <p className="text-sm text-destructive" role="alert">
              {result}
            </p>
          )}

          {result && typeof result === "object" && (
            <p className="rounded-md bg-muted p-3 text-sm">
              Imported <strong>{result.created}</strong> client{result.created === 1 ? "" : "s"} from{" "}
              {result.format === "google" ? "Google Contacts" : "Outlook"} CSV.
              {result.skipped > 0 && ` ${result.skipped} skipped (already existed or empty).`}
              {result.errors > 0 && ` ${result.errors} failed.`}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
