"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPicker } from "@/components/trips/client-picker";
import { centsToDollarsInputValue } from "@/lib/format";

function dateInputValue(date) {
	if (!date) return "";
	return new Date(date).toISOString().slice(0, 10);
}

const STATUSES = [
	{ value: "INQUIRY", label: "Inquiry" },
	{ value: "QUOTED", label: "Quoted" },
	{ value: "BOOKED", label: "Booked" },
	{ value: "TRAVELING", label: "Traveling" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "CANCELLED", label: "Cancelled" },
];

/**
 * @param {{ action: Function, trip?: object, clients: object[], lockClient?: boolean, submitLabel: string }} props
 */
export function TripForm({ action, trip, clients, lockClient = false, submitLabel }) {
	const [errorMessage, formAction, pending] = useActionState(action, undefined);

	return (
		<form
			action={formAction}
			className="space-y-6"
		>
			{/* TRIP BASICS */}
			<Card>
				<CardHeader>
					<CardTitle>Trip details</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Set the client, travel timing, booking stage, and commercial baseline for this trip.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="clientId">Client</Label>
						<ClientPicker
							clients={clients}
							name="clientId"
							defaultValue={trip?.clientId}
							disabled={lockClient}
						/>
						<p className="text-xs text-muted-foreground">The primary household or traveler responsible for this booking.</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="name">Trip name</Label>
						<Input
							id="name"
							name="name"
							defaultValue={trip?.name}
							placeholder="Tuscany Anniversary Escape"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="destination">Destination</Label>
						<Input
							id="destination"
							name="destination"
							defaultValue={trip?.destination}
							placeholder="Florence, Italy"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="startDate">Start date</Label>
						<Input
							id="startDate"
							name="startDate"
							type="date"
							defaultValue={dateInputValue(trip?.startDate)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="endDate">End date</Label>
						<Input
							id="endDate"
							name="endDate"
							type="date"
							defaultValue={dateInputValue(trip?.endDate)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<Select
							name="status"
							defaultValue={trip?.status ?? "INQUIRY"}
						>
							<SelectTrigger
								id="status"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUSES.map((s) => (
									<SelectItem
										key={s.value}
										value={s.value}
									>
										{s.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="totalPrice">Total price</Label>
						<Input
							id="totalPrice"
							name="totalPrice"
							type="number"
							step="0.01"
							min="0"
							defaultValue={centsToDollarsInputValue(trip?.totalPrice)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="finalPaymentDate">Final payment date</Label>
						<Input
							id="finalPaymentDate"
							name="finalPaymentDate"
							type="date"
							defaultValue={dateInputValue(trip?.finalPaymentDate)}
						/>
					</div>
				</CardContent>
			</Card>

			{errorMessage && (
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="p-4">
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{errorMessage}
						</p>
					</CardContent>
				</Card>
			)}

			{/* FORM ACTIONS */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 shadow-sm">
				<p className="text-sm text-muted-foreground">Saving here updates the trip overview, itinerary context, and downstream billing workflows.</p>
				<Button
					type="submit"
					disabled={pending}
				>
					{pending ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
