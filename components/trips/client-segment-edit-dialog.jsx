"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientSegmentDetails } from "@/app/(admin)/trips/[tripId]/details/actions";

export function ClientSegmentEditDialog({ segment }) {
	const [open, setOpen] = useState(false);
	const action = updateClientSegmentDetails.bind(null, segment.id);
	const [error, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);
	const canEditSeat = segment.type === "FLIGHT";

	useEffect(() => {
		if (wasPending.current && !pending && !error) {
			setOpen(false);
		}
		wasPending.current = pending;
	}, [pending, error]);

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
				>
					<Pencil className="size-4" />
					<span className="sr-only">Edit your booking details for {segment.title}</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit booking details</DialogTitle>
				</DialogHeader>
				<form
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="confirmationNumber">Confirmation #</Label>
						<Input
							id="confirmationNumber"
							name="confirmationNumber"
							defaultValue={segment.confirmationNumber || ""}
						/>
					</div>
					{canEditSeat && (
						<div className="space-y-2">
							<Label htmlFor="seatNumber">Seat</Label>
							<Input
								id="seatNumber"
								name="seatNumber"
								defaultValue={segment.details?.seatNumber || ""}
								placeholder="12A"
							/>
						</div>
					)}
					{error && (
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{error}
						</p>
					)}
					<DialogFooter>
						<Button
							type="submit"
							disabled={pending}
						>
							{pending ? "Saving..." : "Save changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
