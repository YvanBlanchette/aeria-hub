"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importCruiseMapperItinerary } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function ImportCruiseItineraryDialog({ tripId, itineraries = [] }) {
	const action = importCruiseMapperItinerary.bind(null, tripId);
	const [result, formAction, pending] = useActionState(action, undefined);
	const formRef = useRef(null);

	return (
		<Dialog
			onOpenChange={(open) => {
				if (open) formRef.current?.reset();
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
				>
					<Upload className="size-4" />
					Import scraped itinerary
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Import one scraped itinerary</DialogTitle>
					<DialogDescription>Select one stored itinerary and inject its port calls into this trip's itinerary builder.</DialogDescription>
				</DialogHeader>

				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					{itineraries.length === 0 && (
						<p className="rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
							No stored itineraries found in database. Run scraper then sync to DB, then reopen this dialog.
						</p>
					)}

					<div className="space-y-2">
						<Label htmlFor="itineraryId">Stored itinerary</Label>
						<Select
							name="itineraryId"
							required
						>
							<SelectTrigger
								id="itineraryId"
								className="w-full"
							>
								<SelectValue placeholder="Select an itinerary" />
							</SelectTrigger>
							<SelectContent>
								{itineraries.map((it) => (
									<SelectItem
										key={it.id}
										value={it.id}
									>
										{it.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mode">Import mode</Label>
						<Select
							name="mode"
							defaultValue="append"
						>
							<SelectTrigger
								id="mode"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="append">Append to existing segments</SelectItem>
								<SelectItem value="replace">Replace existing cruise segments</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<label
						className="flex items-center gap-2 text-sm text-muted-foreground"
						htmlFor="includeSeaDays"
					>
						<input
							id="includeSeaDays"
							name="includeSeaDays"
							type="checkbox"
							className="size-4"
						/>
						Include sea days as segments
					</label>

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
							Imported <strong>{result.imported}</strong> segment{result.imported === 1 ? "" : "s"}
							{result.shipName ? ` from ${result.shipName}` : ""}
							{result.title ? ` (${result.title})` : ""}.
						</p>
					)}

					<DialogFooter>
						<Button
							type="submit"
							disabled={pending || itineraries.length === 0}
						>
							{pending ? "Importing..." : "Import into this trip"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
