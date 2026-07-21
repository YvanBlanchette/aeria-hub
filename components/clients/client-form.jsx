"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dateInputValue(date) {
	if (!date) return "";
	return new Date(date).toISOString().slice(0, 10);
}

/**
 * @param {{ action: Function, client?: object, agents: {id:string,name:string}[], submitLabel: string }} props
 */
export function ClientForm({ action, client, agents, submitLabel }) {
	const [errorMessage, formAction, pending] = useActionState(action, undefined);

	return (
		<form
			action={formAction}
			className="space-y-6"
		>
			{/* BASIC INFO */}
			<Card>
				<CardHeader>
					<CardTitle>Basic info</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Core identity and contact details used across every trip, reminder, and invoice.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="firstName">First name</Label>
						<Input
							id="firstName"
							name="firstName"
							defaultValue={client?.firstName}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="lastName">Last name</Label>
						<Input
							id="lastName"
							name="lastName"
							defaultValue={client?.lastName}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="primaryEmail">Primary email</Label>
						<Input
							id="primaryEmail"
							name="primaryEmail"
							type="email"
							defaultValue={client?.primaryEmail ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="secondaryEmail">Secondary email</Label>
						<Input
							id="secondaryEmail"
							name="secondaryEmail"
							type="email"
							defaultValue={client?.secondaryEmail ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="primaryPhone">Primary phone</Label>
						<Input
							id="primaryPhone"
							name="primaryPhone"
							defaultValue={client?.primaryPhone ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="secondaryPhone">Secondary phone</Label>
						<Input
							id="secondaryPhone"
							name="secondaryPhone"
							defaultValue={client?.secondaryPhone ?? ""}
						/>
					</div>
				</CardContent>
			</Card>

			{/* ADDRESS */}
			<Card>
				<CardHeader>
					<CardTitle>Address</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Home and mailing details for service coordination and documentation.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="address">Street address</Label>
						<Input
							id="address"
							name="address"
							defaultValue={client?.address ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="city">City</Label>
						<Input
							id="city"
							name="city"
							defaultValue={client?.city ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="stateProvince">Province / State</Label>
						<Input
							id="stateProvince"
							name="stateProvince"
							defaultValue={client?.stateProvince ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="postalCode">Postal / ZIP code</Label>
						<Input
							id="postalCode"
							name="postalCode"
							defaultValue={client?.postalCode ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="country">Country</Label>
						<Input
							id="country"
							name="country"
							defaultValue={client?.country ?? ""}
						/>
					</div>
				</CardContent>
			</Card>

			{/* TRAVEL DETAILS */}
			<Card>
				<CardHeader>
					<CardTitle>Travel details</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Passport and traveler identity fields that power reminders and pre-departure readiness.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="dateOfBirth">Date of birth</Label>
						<Input
							id="dateOfBirth"
							name="dateOfBirth"
							type="date"
							defaultValue={dateInputValue(client?.dateOfBirth)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="nationality">Nationality</Label>
						<Input
							id="nationality"
							name="nationality"
							defaultValue={client?.nationality ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="passportNumber">Passport number</Label>
						<Input
							id="passportNumber"
							name="passportNumber"
							defaultValue={client?.passportNumber ?? ""}
						/>
					</div>
					<div /> {/* keeps issue/expiry paired on their own row on desktop */}
					<div className="space-y-2">
						<Label htmlFor="passportIssueDate">Passport issue date</Label>
						<Input
							id="passportIssueDate"
							name="passportIssueDate"
							type="date"
							defaultValue={dateInputValue(client?.passportIssueDate)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="passportExpiry">Passport expiry date</Label>
						<Input
							id="passportExpiry"
							name="passportExpiry"
							type="date"
							defaultValue={dateInputValue(client?.passportExpiry)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="redressNumber">Redress number</Label>
						<Input
							id="redressNumber"
							name="redressNumber"
							defaultValue={client?.redressNumber ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="knownTravelerNumber">Known Traveler Number</Label>
						<Input
							id="knownTravelerNumber"
							name="knownTravelerNumber"
							defaultValue={client?.knownTravelerNumber ?? ""}
						/>
					</div>
				</CardContent>
			</Card>

			{/* PREFERENCES */}
			<Card>
				<CardHeader>
					<CardTitle>Preferences & notes</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Record service context so future bookings start with the right assumptions.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="travelPreferences">Travel preferences</Label>
						<Textarea
							id="travelPreferences"
							name="travelPreferences"
							rows={4}
							placeholder="Window seat, boutique hotels, direct flights..."
							defaultValue={client?.travelPreferences ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="dietaryNotes">Dietary / medical notes</Label>
						<Textarea
							id="dietaryNotes"
							name="dietaryNotes"
							rows={4}
							placeholder="Allergies, medical conditions, dietary restrictions..."
							defaultValue={client?.dietaryNotes ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="mobilityNotes">Mobility notes</Label>
						<Textarea
							id="mobilityNotes"
							name="mobilityNotes"
							rows={4}
							defaultValue={client?.mobilityNotes ?? ""}
						/>
					</div>
				</CardContent>
			</Card>

			{/* STATUS */}
			<Card>
				<CardHeader>
					<CardTitle>Status & assignment</CardTitle>
					<p className="text-sm leading-6 text-muted-foreground">Control relationship ownership and whether this client remains active in the CRM.</p>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<Select
							name="status"
							defaultValue={client?.status ?? "ACTIVE"}
						>
							<SelectTrigger
								id="status"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ACTIVE">Active</SelectItem>
								<SelectItem value="INACTIVE">Inactive</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="assignedAgentId">Assigned agent</Label>
						<Select
							name="assignedAgentId"
							defaultValue={client?.assignedAgentId ?? ""}
						>
							<SelectTrigger
								id="assignedAgentId"
								className="w-full"
							>
								<SelectValue placeholder="Unassigned" />
							</SelectTrigger>
							<SelectContent>
								{agents.map((agent) => (
									<SelectItem
										key={agent.id}
										value={agent.id}
									>
										{agent.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
				<p className="text-sm text-muted-foreground">Saving updates this profile across trips, documents, reminders, traveler records, and invoicing.</p>
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
