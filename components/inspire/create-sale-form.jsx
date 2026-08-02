"use client";

import { useActionState } from "react";
import { createInspireSale } from "@/app/(admin)/inspire/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateSaleForm({ influencers, offers }) {
	const [state, action, pending] = useActionState(createInspireSale, undefined);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add a sale</CardTitle>
				<CardDescription>Record a confirmed booking and calculate a commission instantly.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					action={action}
					className="space-y-4"
				>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="influencerId">Influencer</Label>
							<select
								id="influencerId"
								name="influencerId"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								required
							>
								<option value="">Select an influencer</option>
								{influencers.map((influencer) => (
									<option
										key={influencer.id}
										value={influencer.id}
									>
										{influencer.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="offerId">Offer</Label>
							<select
								id="offerId"
								name="offerId"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">Unlinked</option>
								{offers.map((offer) => (
									<option
										key={offer.id}
										value={offer.id}
									>
										{offer.title}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="clientName">Client name</Label>
							<Input
								id="clientName"
								name="clientName"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bookingAmountCents">Booking amount (cents)</Label>
							<Input
								id="bookingAmountCents"
								name="bookingAmountCents"
								type="number"
								min="0"
								defaultValue="0"
							/>
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="commissionRate">Commission rate (%)</Label>
							<Input
								id="commissionRate"
								name="commissionRate"
								type="number"
								min="0"
								max="100"
								defaultValue="0"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="status">Status</Label>
							<select
								id="status"
								name="status"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="CONFIRMED">Confirmed</option>
								<option value="PENDING">Pending</option>
							</select>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							name="notes"
							rows={4}
						/>
					</div>
					{state?.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={pending}
						>
							{pending ? "Saving..." : "Save sale"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
