import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableField } from "@/components/clients/copyable-field";
import { LoyaltyProgramFormDialog } from "@/components/clients/loyalty-program-form-dialog";
import { LoyaltyProgramsTable } from "@/components/clients/loyalty-programs-table";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { ClientPortalAccessDialog } from "@/components/clients/client-portal-access-dialog";

export default async function ClientProfilePage({ params }) {
	const { clientId } = await params;
	const sessionUser = await requireUser();

	const client = await prisma.client.findUnique({
		where: { id: clientId },
		include: { portalUser: { select: { id: true, portalEnabled: true, email: true } } },
	});
	if (!client) notFound();

	const [loyaltyPrograms, primaryTrips, companionLinks, activity] = await Promise.all([
		prisma.loyaltyProgram.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } }),
		prisma.trip.findMany({
			where: { clientId },
			orderBy: { startDate: "desc" },
			take: 5,
			select: { id: true, name: true, destination: true, startDate: true, endDate: true, status: true },
		}),
		prisma.tripClient.findMany({
			where: { clientId },
			include: { trip: { select: { id: true, name: true, destination: true, startDate: true, endDate: true, status: true } } },
		}),
		prisma.activityLog.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
			take: 10,
			include: { user: { select: { name: true } } },
		}),
	]);
	const recentTrips = [...primaryTrips.map((trip) => ({ ...trip, isCompanion: false })), ...companionLinks.map(({ trip }) => ({ ...trip, isCompanion: true }))]
		.sort((a, b) => new Date(b.startDate ?? 0) - new Date(a.startDate ?? 0))
		.slice(0, 5);

	return (
		<div className="space-y-6">
			{sessionUser.role === "ADMIN" && (
				<Card className="p-0">
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Client portal access</CardTitle>
						<ClientPortalAccessDialog
							clientId={client.id}
							clientName={`${client.firstName} ${client.lastName}`}
							email={client.primaryEmail}
							hasPortalAccess={Boolean(client.portalUser)}
						/>
					</CardHeader>
					<CardContent className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm text-muted-foreground">
							{client.portalUser
								? client.portalUser.portalEnabled
									? `Portal access enabled for ${client.portalUser.email}.`
									: "Portal access is disabled for this client."
								: "No portal login has been created for this client yet."}
						</p>
					</CardContent>
				</Card>
			)}
			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Contact & address</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="First Name"
							value={client.firstName}
						/>
						<CopyableField
							label="Last Name"
							value={client.lastName}
						/>
						<CopyableField
							label="Date of birth"
							value={client.dateOfBirth ? formatDate(client.dateOfBirth) : null}
						/>
						<CopyableField
							label="Primary email"
							value={client.primaryEmail}
						/>
						<CopyableField
							label="Primary phone"
							value={client.primaryPhone}
						/>
						<CopyableField
							label="Secondary phone"
							value={client.secondaryPhone}
						/>
						{/* <CopyableField
							label="Secondary email"
							value={client.secondaryEmail}
						/> */}
						<CopyableField
							label="Address"
							value={client.address}
						/>
						<CopyableField
							label="City"
							value={client.city}
						/>
						<CopyableField
							label="Postal / ZIP code"
							value={client.postalCode}
						/>
						<CopyableField
							label="Province / State"
							value={client.stateProvince}
						/>
						<CopyableField
							label="Country"
							value={client.country}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle>Trips</CardTitle>
					<Button
						variant="outline"
						size="sm"
						asChild
					>
						<Link href={`/clients/${clientId}/trips`}>
							View all <ArrowRight className="size-4" />
						</Link>
					</Button>
				</CardHeader>
				<CardContent className="space-y-2 p-3">
					{recentTrips.length === 0 ? (
						<p className="p-2 text-sm text-muted-foreground">No trips on record for this client.</p>
					) : (
						recentTrips.map((trip) => (
							<Link
								key={trip.id}
								href={`/trips/${trip.id}/overview`}
								className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40"
							>
								<div>
									<div className="flex items-center gap-2">
										<p className="font-medium">{trip.name}</p>
										{trip.isCompanion && (
											<Badge
												variant="outline"
												className="text-[10px]"
											>
												Companion
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										{trip.destination} · {trip.startDate ? formatDate(trip.startDate) : "No departure date"}
									</p>
								</div>
								<Badge variant={trip.status === "BOOKED" || trip.status === "TRAVELING" ? "default" : "secondary"}>{trip.status}</Badge>
							</Link>
						))
					)}
				</CardContent>
			</Card>

			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Travel details</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="Passport number"
							value={client.passportNumber}
						/>
						<CopyableField
							label="Passport issue date"
							value={client.passportIssueDate ? formatDate(client.passportIssueDate) : null}
						/>
						<CopyableField
							label="Passport expiry date"
							value={client.passportExpiry ? formatDate(client.passportExpiry) : null}
						/>
						<CopyableField
							label="Nationality"
							value={client.nationality}
						/>
						<CopyableField
							label="Redress number"
							value={client.redressNumber}
						/>
						<CopyableField
							label="Known Traveler Number"
							value={client.knownTravelerNumber}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="py-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Preferences & notes</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 px-0 pb-0">
					<dl className="grid grid-cols-1 gap-4 md:grid-cols-3 px-4">
						<CopyableField
							label="Travel preferences"
							value={client.travelPreferences}
						/>
						<CopyableField
							label="Dietary / medical notes"
							value={client.dietaryNotes}
						/>
						<CopyableField
							label="Mobility notes"
							value={client.mobilityNotes}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle>Loyalty programs</CardTitle>
					<LoyaltyProgramFormDialog
						clientId={clientId}
						trigger={
							<Button
								size="sm"
								variant="outline"
							>
								<Plus className="size-4" />
								Add loyalty program
							</Button>
						}
					/>
				</CardHeader>
				<CardContent className="p-0">
					{loyaltyPrograms.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No loyalty programs on file.</p>
					) : (
						<LoyaltyProgramsTable
							loyaltyPrograms={loyaltyPrograms}
							clientId={clientId}
						/>
					)}
				</CardContent>
			</Card>

			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Recent activity</CardTitle>
				</CardHeader>
				<CardContent>
					{activity.length === 0 ? (
						<p className="text-sm text-muted-foreground">No activity recorded yet.</p>
					) : (
						<ul className="space-y-3">
							{activity.map((entry) => (
								<li
									key={entry.id}
									className="text-sm"
								>
									<span className="text-muted-foreground">{formatDate(entry.createdAt)} — </span>
									{entry.description || entry.action}
									{entry.user?.name ? <span className="text-muted-foreground"> ({entry.user.name})</span> : null}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
