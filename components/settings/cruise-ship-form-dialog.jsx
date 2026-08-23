"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCruiseShip, updateCruiseShip } from "@/app/(admin)/settings/cruise-catalog/actions";

export function CruiseShipFormDialog({ ship, cruiseLines = [] }) {
	const [open, setOpen] = useState(false);
	const [supplierId, setSupplierId] = useState(ship?.supplierId || "none");
	const action = ship ? updateCruiseShip.bind(null, ship.id) : createCruiseShip;
	const [error, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);

	useEffect(() => {
		if (wasPending.current && !pending && !error) setOpen(false);
		wasPending.current = pending;
	}, [pending, error]);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setSupplierId(ship?.supplierId || "none");
			}}
		>
			<DialogTrigger asChild>
				{ship ? (
					<Button
						variant="ghost"
						size="icon-sm"
					>
						<Pencil className="size-4" />
						<span className="sr-only">Edit {ship.name}</span>
					</Button>
				) : (
					<Button>
						<Plus className="size-4" />
						New ship
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{ship ? "Edit cruise ship" : "New cruise ship"}</DialogTitle>
				</DialogHeader>
				<form
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							name="name"
							placeholder="Symphony of the Seas"
							defaultValue={ship?.name}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="supplierId">Cruise line</Label>
						<input
							type="hidden"
							name="supplierId"
							value={supplierId === "none" ? "" : supplierId}
						/>
						<Select
							value={supplierId}
							onValueChange={setSupplierId}
						>
							<SelectTrigger
								id="supplierId"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{cruiseLines.map((line) => (
									<SelectItem
										key={line.id}
										value={line.id}
									>
										{line.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<DialogFooter showCloseButton>
						<Button
							type="submit"
							disabled={pending}
						>
							{ship ? "Save changes" : "Create ship"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
