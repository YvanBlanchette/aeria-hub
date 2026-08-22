import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripTabNav } from "@/components/trips/trip-tab-nav";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { DuplicateTripDialog } from "@/components/trips/duplicate-trip-dialog";
import { formatDate } from "@/lib/format";
import { requireTripAccess } from "@/lib/trip-access";

const STATUS_VARIANT = {
	INQUIRY: "secondary",
	QUOTED: "secondary",
	BOOKED: "default",
	TRAVELING: "default",
	COMPLETED: "secondary",
	CANCELLED: "destructive",
};

export default async function TripLayout({ children, params }) {
	const { tripId } = await params;
	const { user, access } = await requireTripAccess(tripId);
	const isStaff = access === "staff";
	if (isStaff) {
		try {
			await prisma.recentView.upsert({
				where: { userId_entityType_entityId: { userId: user.id, entityType: "Trip", entityId: tripId } },
				create: { userId: user.id, entityType: "Trip", entityId: tripId },
				update: { viewedAt: new Date() },
			});
		} catch (error) {
			console.error("Could not record recent trip view", error);
		}
	}

	const [trip, clients] = await Promise.all([
		prisma.trip.findUnique({
			where: { id: tripId },
			select: {
				id: true,
				name: true,
				destination: true,
				startDate: true,
				endDate: true,
				status: true,
				client: { select: { id: true, firstName: true, lastName: true } },
			},
		}),
		isStaff
			? prisma.client.findMany({
					where: user.role === "ADMIN" ? undefined : { assignedAgentId: user.id },
					orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
					select: { id: true, firstName: true, lastName: true, primaryEmail: true },
				})
			: [],
	]);

	if (!trip) notFound();

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold tracking-tight">{trip.name}</h1>
						<Badge variant={STATUS_VARIANT[trip.status] || "secondary"}>{trip.status}</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						{trip.destination} ·{" "}
						{isStaff ? (
							<Link
								href={`/clients/${trip.client.id}`}
								className="hover:underline"
							>
								{trip.client.firstName} {trip.client.lastName}
							</Link>
						) : (
							<span>
								{trip.client.firstName} {trip.client.lastName}
							</span>
						)}
						{trip.startDate && ` · ${formatDate(trip.startDate)}${trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}`}
					</p>
				</div>
				{isStaff && (
					<div className="flex items-center gap-2">
						<DuplicateTripDialog
							tripId={trip.id}
							clients={clients}
						/>
						<Button
							variant="outline"
							asChild
						>
							<Link href={`/trips/${trip.id}/edit`}>
								<Pencil className="size-4" />
								Edit
							</Link>
						</Button>
						<DeleteTripButton
							tripId={trip.id}
							clientId={trip.client.id}
							tripName={trip.name}
						/>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-6 md:flex-row">
				<TripTabNav
					tripId={trip.id}
					role={user.role}
				/>
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
