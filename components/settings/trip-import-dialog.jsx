"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importTripsCsv } from "@/app/(admin)/settings/actions";

export function TripImportDialog() {
	const [result, formAction, pending] = useActionState(importTripsCsv, undefined);
	const formRef = useRef(null);
	return (
		<Dialog onOpenChange={(open) => open && formRef.current?.reset()}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Upload className="size-4" />
					Import trips
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Import trips from CSV</DialogTitle>
					<DialogDescription>Use the exported AERIA Hub format. Each row must match an existing client by email.</DialogDescription>
				</DialogHeader>
				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="tripCsvFile">CSV file</Label>
						<Input
							id="tripCsvFile"
							name="file"
							type="file"
							accept=".csv,text/csv"
							required
						/>
					</div>
					{typeof result === "string" && (
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{result}
						</p>
					)}
					{result && typeof result === "object" && (
						<p className="rounded-md bg-muted p-3 text-sm">
							Imported <strong>{result.created}</strong> trip{result.created === 1 ? "" : "s"}. {result.skipped} skipped.
						</p>
					)}
					<DialogFooter>
						<Button
							type="submit"
							disabled={pending}
						>
							{pending ? "Importing..." : "Import"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
