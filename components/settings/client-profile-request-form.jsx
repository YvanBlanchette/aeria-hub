"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestClientProfileUpdate } from "@/app/(admin)/settings/actions";

function dateInputValue(date) {
	if (!date) return "";
	return new Date(date).toISOString().slice(0, 10);
}

export function ClientProfileRequestForm({ client }) {
	const [result, formAction, pending] = useActionState(requestClientProfileUpdate, undefined);
	const wasPending = useRef(false);

	useEffect(() => {
		if (!wasPending.current || pending) {
			wasPending.current = pending;
			return;
		}
		if (result?.ok) toast.success("Request submitted for approval.");
		else if (result) toast.error(result);
		wasPending.current = pending;
	}, [pending, result]);

	return (
		<form
			action={formAction}
			className="space-y-5"
		>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="firstName">First name</Label>
					<Input
						id="firstName"
						name="firstName"
						defaultValue={client.firstName || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="lastName">Last name</Label>
					<Input
						id="lastName"
						name="lastName"
						defaultValue={client.lastName || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="primaryEmail">Primary email</Label>
					<Input
						id="primaryEmail"
						name="primaryEmail"
						type="email"
						defaultValue={client.primaryEmail || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="secondaryEmail">Secondary email</Label>
					<Input
						id="secondaryEmail"
						name="secondaryEmail"
						type="email"
						defaultValue={client.secondaryEmail || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="primaryPhone">Primary phone</Label>
					<Input
						id="primaryPhone"
						name="primaryPhone"
						defaultValue={client.primaryPhone || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="secondaryPhone">Secondary phone</Label>
					<Input
						id="secondaryPhone"
						name="secondaryPhone"
						defaultValue={client.secondaryPhone || ""}
					/>
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="address">Address</Label>
					<Input
						id="address"
						name="address"
						defaultValue={client.address || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="city">City</Label>
					<Input
						id="city"
						name="city"
						defaultValue={client.city || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="stateProvince">Province / State</Label>
					<Input
						id="stateProvince"
						name="stateProvince"
						defaultValue={client.stateProvince || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="postalCode">Postal code</Label>
					<Input
						id="postalCode"
						name="postalCode"
						defaultValue={client.postalCode || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="country">Country</Label>
					<Input
						id="country"
						name="country"
						defaultValue={client.country || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="dateOfBirth">Date of birth</Label>
					<Input
						id="dateOfBirth"
						name="dateOfBirth"
						type="date"
						defaultValue={dateInputValue(client.dateOfBirth)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="nationality">Nationality</Label>
					<Input
						id="nationality"
						name="nationality"
						defaultValue={client.nationality || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="passportNumber">Passport number</Label>
					<Input
						id="passportNumber"
						name="passportNumber"
						defaultValue={client.passportNumber || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="passportIssueDate">Passport issue date</Label>
					<Input
						id="passportIssueDate"
						name="passportIssueDate"
						type="date"
						defaultValue={dateInputValue(client.passportIssueDate)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="passportExpiry">Passport expiry date</Label>
					<Input
						id="passportExpiry"
						name="passportExpiry"
						type="date"
						defaultValue={dateInputValue(client.passportExpiry)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="knownTravelerNumber">Known traveler number</Label>
					<Input
						id="knownTravelerNumber"
						name="knownTravelerNumber"
						defaultValue={client.knownTravelerNumber || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="redressNumber">Redress number</Label>
					<Input
						id="redressNumber"
						name="redressNumber"
						defaultValue={client.redressNumber || ""}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="travelPreferences">Travel preferences</Label>
					<Textarea
						id="travelPreferences"
						name="travelPreferences"
						rows={4}
						defaultValue={client.travelPreferences || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="dietaryNotes">Dietary / medical notes</Label>
					<Textarea
						id="dietaryNotes"
						name="dietaryNotes"
						rows={4}
						defaultValue={client.dietaryNotes || ""}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="mobilityNotes">Mobility notes</Label>
					<Textarea
						id="mobilityNotes"
						name="mobilityNotes"
						rows={4}
						defaultValue={client.mobilityNotes || ""}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
				<p className="text-sm text-muted-foreground">Changes are sent for approval and will not update your profile immediately.</p>
				<Button
					type="submit"
					disabled={pending}
				>
					{pending ? "Submitting..." : "Submit change request"}
				</Button>
			</div>
		</form>
	);
}
