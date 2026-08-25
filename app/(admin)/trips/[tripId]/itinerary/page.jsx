import { notFound } from "next/navigation";
import { Anchor, CalendarDays, Clock, Ship, MapPin, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";
import { requireTripAccess } from "@/lib/trip-access";
import { DestinationInfoDialog } from "@/components/shared/destination-info-dialog";
import { buildShoreExcursionsUrl } from "@/lib/shore-excursions";

function dateKey(date) {
	if (!date) return null;
	const d = new Date(date);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
	const [year, month, day] = key.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

function buildTripDays(trip, segments) {
	const startKey = dateKey(trip.startDate);
	const endKey = dateKey(trip.endDate || trip.startDate);
	if (!startKey || !endKey) {
		const keys = [...new Set(segments.map((segment) => dateKey(segment.startDateTime)).filter(Boolean))].sort();
		return keys.map((key, index) => ({ key, label: `Day ${index + 1}`, date: dateFromKey(key) }));
	}

	const start = dateFromKey(startKey);
	const end = dateFromKey(endKey);
	const days = [];
	let index = 1;
	for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
		days.push({ key: dateKey(cursor), label: `Day ${index}`, date: new Date(cursor) });
		index += 1;
	}
	return days;
}

function getCruiseCallsForDay(segments, key) {
	return segments.flatMap((segment) => {
		if (segment.type !== "CRUISE" || !Array.isArray(segment.details?.cruiseItinerary)) return [];
		return segment.details.cruiseItinerary.filter((call) => call.date === key).map((call) => ({ ...call, segment }));
	});
}

/** Distinct ship names used by CRUISE segments, for a single batch CruiseShip lookup. */
function collectCruiseShipNames(segments) {
	const names = new Set();
	for (const segment of segments) {
		if (segment.type === "CRUISE" && segment.details?.shipName) names.add(segment.details.shipName);
	}
	return [...names];
}

/** Total cruise length in nights for a ship, derived from its port-call dates across the trip. */
function computeCruiseNights(segments, shipName) {
	const dates = new Set();
	for (const segment of segments) {
		if (segment.type !== "CRUISE" || segment.details?.shipName !== shipName) continue;
		if (Array.isArray(segment.details?.cruiseItinerary)) {
			for (const row of segment.details.cruiseItinerary) {
				if (row.date) dates.add(row.date);
			}
		} else if (segment.startDateTime) {
			dates.add(dateKey(segment.startDateTime));
		}
	}
	return dates.size > 1 ? dates.size - 1 : null;
}

function timeRange(segment) {
	const start = formatTime(segment.startDateTime);
	const end = formatTime(segment.endDateTime);
	if (start && end && start !== end) return `${start} - ${end}`;
	return start || end || null;
}

function ItineraryTime({ children }) {
	return (
		<div className="ml-auto flex shrink-0 items-center gap-2 text-sm tabular-nums text-muted-foreground">
			<Clock className="size-3.5" />
			<span>{children || "Time TBD"}</span>
		</div>
	);
}

export default async function ItineraryPage({ params }) {
	const { tripId } = await params;
	await requireTripAccess(tripId);

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: {
			id: true,
			startDate: true,
			endDate: true,
			segments: {
				where: { type: { not: "INSURANCE" } },
				orderBy: [{ startDateTime: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
				include: { supplier: { select: { id: true, name: true } } },
			},
		},
	});
	if (!trip) notFound();

	const shipNames = collectCruiseShipNames(trip.segments);
	const cruiseShipRows = shipNames.length
		? await prisma.cruiseShip.findMany({
				where: { name: { in: shipNames } },
				select: { name: true, excursionsShipCode: true, supplier: { select: { excursionsLineCode: true } } },
			})
		: [];
	const shipCodeMap = new Map(
		cruiseShipRows.map((row) => [row.name.toLowerCase(), { shipCode: row.excursionsShipCode, lineCode: row.supplier?.excursionsLineCode }]),
	);

	const days = buildTripDays(trip, trip.segments);

	return (
		<div className="space-y-4">
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center gap-2">
					<CalendarDays className="size-4" />
					<CardTitle>Itinerary</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 p-4">
					{days.length === 0 ? <p className="text-sm text-muted-foreground">Add dated travel elements to build the itinerary.</p> : null}
					{days.map((day) => {
						const daySegments = trip.segments.filter((segment) => dateKey(segment.startDateTime) === day.key);
						const cruiseCalls = getCruiseCallsForDay(trip.segments, day.key);
						const visibleSegments = daySegments.filter((segment) => segment.type !== "CRUISE" || !Array.isArray(segment.details?.cruiseItinerary));
						const itemCount = visibleSegments.length + cruiseCalls.length;

						return (
							<section
								key={day.key}
								className="overflow-hidden rounded-lg border border-border bg-background/60"
							>
								<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/35 px-4 py-3">
									<div>
										<p className="text-sm font-semibold">{day.label}</p>
										<p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
									</div>
									<Badge variant={itemCount ? "secondary" : "outline"}>{itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Open day"}</Badge>
								</div>
								<div className="space-y-3 p-4">
									{itemCount === 0 && <p className="text-sm text-muted-foreground">No scheduled items.</p>}
									{cruiseCalls.map((call, index) => {
										const shipName = call.segment.details?.shipName || "";
										const shipEntry = shipCodeMap.get(shipName.toLowerCase());
										const excursionsUrl = call.port
											? buildShoreExcursionsUrl({
													lineCode: shipEntry?.lineCode,
													shipCode: shipEntry?.shipCode,
													arrivalDate: call.date,
													nights: computeCruiseNights(trip.segments, shipName),
												})
											: null;
										return (
											<div
												key={`${call.segment.id}-${call.date}-${index}`}
												className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm ring-1 ring-border/70"
											>
												<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
													<Anchor className="size-4" />
												</div>
												<div className="min-w-0 flex-1">
													{call.port ? (
														<DestinationInfoDialog
															location={call.port}
															date={call.segment.startDateTime}
														>
															<button
																type="button"
																className="font-medium underline-offset-2 hover:underline"
															>
																{call.port}
															</button>
														</DestinationInfoDialog>
													) : (
														<p className="font-medium">At sea</p>
													)}
													<p className="text-xs text-muted-foreground">
														<Ship className="mr-1 inline size-3" />
														{call.segment.details?.shipName || call.segment.title}
													</p>
												</div>
												<ItineraryTime>{`${call.arrivalTime || "--:--"} / ${call.departureTime || "--:--"}`}</ItineraryTime>
												{excursionsUrl && (
													<Button
														asChild
														size="sm"
														variant="outline"
														className="w-full sm:w-auto"
													>
														<a
															href={excursionsUrl}
															target="_blank"
															rel="noopener noreferrer"
														>
															Book your excursions
															<ExternalLink className="size-3.5" />
														</a>
													</Button>
												)}
											</div>
										);
									})}
									{visibleSegments.map((segment) => {
										const meta = SEGMENT_TYPE_MAP[segment.type] || SEGMENT_TYPE_MAP.OTHER;
										const Icon = meta.icon;
										const shipName = segment.type === "CRUISE" ? segment.details?.shipName || "" : "";
										const shipEntry = shipName ? shipCodeMap.get(shipName.toLowerCase()) : null;
										const excursionsUrl = shipEntry
											? buildShoreExcursionsUrl({
													lineCode: shipEntry.lineCode,
													shipCode: shipEntry.shipCode,
													arrivalDate: segment.startDateTime,
													nights: computeCruiseNights(trip.segments, shipName),
												})
											: null;
										return (
											<div
												key={segment.id}
												className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm ring-1 ring-border/70"
											>
												<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
													<Icon className="size-4" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="font-medium">{segment.title}</p>
													<p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
														{segment.location ? (
															<DestinationInfoDialog
																location={segment.location}
																date={segment.startDateTime}
															>
																<button
																	type="button"
																	className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline"
																>
																	<MapPin className="size-3" />
																	{segment.location}
																</button>
															</DestinationInfoDialog>
														) : (
															"Location TBD"
														)}
														{segment.supplier?.name ? ` · ${segment.supplier.name}` : ""}
													</p>
												</div>
												<ItineraryTime>{timeRange(segment)}</ItineraryTime>
												{excursionsUrl && (
													<Button
														asChild
														size="sm"
														variant="outline"
														className="w-full sm:w-auto"
													>
														<a
															href={excursionsUrl}
															target="_blank"
															rel="noopener noreferrer"
														>
															Book your excursions
															<ExternalLink className="size-3.5" />
														</a>
													</Button>
												)}
											</div>
										);
									})}
								</div>
							</section>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
