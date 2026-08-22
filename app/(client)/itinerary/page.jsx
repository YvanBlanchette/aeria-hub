import { CalendarDays, MapPin } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getClientPortalRecord } from "@/lib/client-portal";
import { formatDate, formatTime } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
	title: "My Itinerary — ÆRIA Hub",
};

const SEGMENT_LABELS = {
	FLIGHT: "Flight",
	HOTEL: "Hotel",
	CRUISE: "Cruise",
	CIRCUIT: "Circuit",
	TRANSFER: "Transfer",
	EXCURSION: "Excursion",
	CAR_RENTAL: "Car rental",
	INSURANCE: "Insurance",
	OTHER: "Travel item",
};

export default async function ClientItineraryPage() {
	const user = await requireUser();
	const portal = await getClientPortalRecord(user);

	if (!portal) {
		return <div className="p-6 text-muted-foreground">No client profile found for this account.</div>;
	}

	const trips = (portal.client.trips || []).filter((trip) => trip.segments?.length);

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Trip details</p>
				<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">My itinerary</h1>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">Your confirmed travel arrangements, organized by trip.</p>
			</div>

			{trips.length === 0 ? (
				<Card>
					<CardContent className="p-6 text-sm text-muted-foreground">Your itinerary details are not available yet.</CardContent>
				</Card>
			) : (
				trips.map((trip) => (
					<Card key={trip.id}>
						<CardHeader>
							<CardTitle>{trip.name}</CardTitle>
							<CardDescription>
								{trip.destination} {trip.startDate && `· ${formatDate(trip.startDate)}${trip.endDate ? ` to ${formatDate(trip.endDate)}` : ""}`}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{trip.segments.map((segment) => (
								<div
									key={segment.id}
									className="rounded-xl border border-border p-4"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">{SEGMENT_LABELS[segment.type] || segment.type}</Badge>
												<p className="font-medium">{segment.title}</p>
											</div>
											{segment.confirmationNumber && <p className="mt-2 text-xs text-muted-foreground">Confirmation: {segment.confirmationNumber}</p>}
										</div>
										{segment.startDateTime && (
											<div className="flex items-center gap-1 text-sm text-muted-foreground">
												<CalendarDays className="size-4" />
												{formatDate(segment.startDateTime)} at {formatTime(segment.startDateTime)}
											</div>
										)}
									</div>
									{segment.location && (
										<div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
											<MapPin className="size-4" />
											{segment.location}
										</div>
									)}
									{segment.notes && <p className="mt-3 text-sm text-muted-foreground">{segment.notes}</p>}
								</div>
							))}
						</CardContent>
					</Card>
				))
			)}
		</div>
	);
}
