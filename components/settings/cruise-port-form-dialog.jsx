"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCruisePort, updateCruisePort } from "@/app/(admin)/settings/cruise-catalog/actions";

export function CruisePortFormDialog({ port, trigger }) {
	const [open, setOpen] = useState(false);
	const action = port ? updateCruisePort.bind(null, port.id) : createCruisePort;
	const [error, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);

	useEffect(() => {
		if (wasPending.current && !pending && !error) setOpen(false);
		wasPending.current = pending;
	}, [pending, error]);

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				{trigger ||
					(port ? (
						<Button
							variant="ghost"
							size="icon-sm"
						>
							<Pencil className="size-4" />
							<span className="sr-only">Edit {port.name}</span>
						</Button>
					) : (
						<Button>
							<Plus className="size-4" />
							New port
						</Button>
					))}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{port ? "Edit cruise port" : "New cruise port"}</DialogTitle>
				</DialogHeader>
				<form
					action={formAction}
					className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								name="name"
								placeholder="Cozumel"
								defaultValue={port?.name}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="country">Country</Label>
							<Input
								id="country"
								name="country"
								placeholder="Mexico"
								defaultValue={port?.country || ""}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="displayText">Display text</Label>
						<Input
							id="displayText"
							name="displayText"
							placeholder="Cozumel, Mexico"
							defaultValue={port?.displayText || ""}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="locode">Locode</Label>
							<Input
								id="locode"
								name="locode"
								placeholder="MXCZM"
								defaultValue={port?.locode || ""}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="latitude">Latitude</Label>
							<Input
								id="latitude"
								name="latitude"
								type="number"
								step="any"
								defaultValue={port?.latitude ?? ""}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="longitude">Longitude</Label>
							<Input
								id="longitude"
								name="longitude"
								type="number"
								step="any"
								defaultValue={port?.longitude ?? ""}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							rows={5}
							defaultValue={port?.description || ""}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="sourceUrl">Source URL</Label>
						<Input
							id="sourceUrl"
							name="sourceUrl"
							placeholder="https://www.cruisemapper.com/ports/..."
							defaultValue={port?.sourceUrl || ""}
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<DialogFooter showCloseButton>
						<Button
							type="submit"
							disabled={pending}
						>
							{port ? "Save changes" : "Create port"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
