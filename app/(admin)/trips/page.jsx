import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, DollarSign, Plane, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { TripFilters } from "@/components/trips/trip-filters";
import { TripsTable } from "@/components/trips/trips-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = {
	title: "Trips — ÆRIA Hub",
};

const PAGE_SIZE = 10;
const DEFAULT_RANGE = "90d";
const RANGE_OPTIONS = [
	{ value: "30d", label: "30D", days: 30 },
	{ value: "90d", label: "90D", days: 90 },
	{ value: "180d", label: "180D", days: 180 },
];

function resolveRange(value) {
	return RANGE_OPTIONS.find((option) => option.value === value) || RANGE_OPTIONS.find((option) => option.value === DEFAULT_RANGE);
}

function createRangeHref(nextRange, params) {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params || {})) {
		if (key === "range") continue;
		if (typeof value === "string") sp.set(key, value);
	}
	sp.set("range", nextRange);
	return `/trips?${sp.toString()}`;
}

export default async function TripsPage({ searchParams }) {
	const params = await searchParams;
	const q = typeof params?.q === "string" ? params.q : "";
	const status = typeof params?.status === "string" ? params.status : "";
	const range = resolveRange(typeof params?.range === "string" ? params.range : DEFAULT_RANGE);
	const page = Math.max(1, parseInt(params?.page, 10) || 1);

	const where = {
		...(status ? { status } : {}),
		...(q
			? {
					OR: [{ name: { contains: q } }, { destination: { contains: q } }],
				}
			: {}),
	};

	const now = new Date();
	const horizonEnd = new Date(now.getTime() + range.days * 24 * 60 * 60 * 1000);
	const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const lookbackStart = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);

	const [
		total,
		trips,
		totalTrips,
		activeTrips,
		upcomingDepartures,
		totalValue,
		statusCounts,
		openTaskCount,
		overdueTaskCount,
		upcomingTrips,
		recentTrips,
		staleInquiries,
		valueBooked,
		valueQuoted,
		missingFinalPayment,
	] = await Promise.all([
		prisma.trip.count({ where }),
		prisma.trip.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.trip.count(),
		prisma.trip.count({ where: { status: { in: ["BOOKED", "TRAVELING"] } } }),
		prisma.trip.count({ where: { startDate: { gte: now, lte: horizonEnd }, status: { in: ["BOOKED", "TRAVELING"] } } }),
		prisma.trip.aggregate({ _sum: { totalPrice: true } }),
		prisma.trip.groupBy({ by: ["status"], _count: { status: true } }),
		prisma.tripTask.count({ where: { completed: false } }),
		prisma.tripTask.count({ where: { completed: false, dueDate: { lt: now } } }),
		prisma.trip.findMany({
			where: { startDate: { gte: now, lte: horizonEnd }, status: { in: ["BOOKED", "TRAVELING"] } },
			orderBy: { startDate: "asc" },
			take: 6,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.trip.findMany({
			where: { createdAt: { gte: lookbackStart } },
			orderBy: { createdAt: "desc" },
			take: 6,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.trip.count({ where: { status: "INQUIRY", createdAt: { lt: lookbackStart } } }),
		prisma.trip.aggregate({ where: { status: { in: ["BOOKED", "TRAVELING"] } }, _sum: { totalPrice: true } }),
		prisma.trip.aggregate({ where: { status: "QUOTED" }, _sum: { totalPrice: true } }),
		prisma.trip.count({ where: { status: { in: ["BOOKED", "TRAVELING"] }, finalPaymentDate: null } }),
	]);

	const statusMap = new Map(statusCounts.map((entry) => [entry.status, entry._count.status]));
	const totalStatusTrips = [...statusMap.values()].reduce((sum, count) => sum + count, 0);
	const pipelineRows = ["INQUIRY", "QUOTED", "BOOKED", "TRAVELING", "COMPLETED", "CANCELLED"].map((status) => {
		const count = statusMap.get(status) || 0;
		const pct = totalStatusTrips ? Math.round((count / totalStatusTrips) * 100) : 0;
		return { status, count, pct };
	});

	const departuresIn7Days = upcomingTrips.filter((trip) => trip.startDate && new Date(trip.startDate) <= in7Days).length;

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	function pageHref(targetPage) {
		const sp = new URLSearchParams();
		if (q) sp.set("q", q);
		if (status) sp.set("status", status);
		if (range.value) sp.set("range", range.value);
		sp.set("page", String(targetPage));
		return `/trips?${sp.toString()}`;
	}

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-2xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Trip operations</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Trips</h1>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground">Bookings, itineraries, and delivery timing across every client in the pipeline.</p>
					</div>
					<div className="flex flex-col gap-2 sm:items-end">
						<div className="flex items-center gap-1 rounded-full border border-border bg-background/70 p-1 shadow-sm backdrop-blur">
							{RANGE_OPTIONS.map((option) => (
								<Button
									key={option.value}
									size="sm"
									variant={range.value === option.value ? "default" : "ghost"}
									className="rounded-full"
									asChild
								>
									<Link href={createRangeHref(option.value, params)}>{option.label}</Link>
								</Button>
							))}
						</div>
						<Button asChild>
							<Link href="/trips/new">
								<Plus className="size-4" />
								New Trip
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Total trips"
					value={totalTrips}
					icon={Plane}
				/>
				<StatCard
					label="Active bookings"
					value={activeTrips}
					icon={CheckCircle2}
				/>
				<StatCard
					label="Upcoming departures"
					value={upcomingDepartures}
					icon={CalendarClock}
				/>
				<StatCard
					label="Total value"
					value={formatCurrency(totalValue._sum.totalPrice || 0)}
					icon={DollarSign}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Trip pipeline</CardTitle>
						<CardDescription>Status distribution across all trips.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{pipelineRows.map((row) => (
							<div
								key={row.status}
								className="space-y-1.5"
							>
								<div className="flex items-center justify-between text-sm">
									<div className="flex items-center gap-2">
										<span className="font-medium">{row.status}</span>
										<Badge variant="secondary">{row.pct}%</Badge>
									</div>
									<span className="text-muted-foreground">{row.count}</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary"
										style={{ width: `${Math.max(row.pct, row.count ? 6 : 0)}%` }}
									/>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Revenue mix</CardTitle>
						<CardDescription>Pipeline value by maturity stage.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2.5 text-sm">
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Booked + traveling value</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(valueBooked._sum.totalPrice || 0)}</p>
						</div>
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Quoted value</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(valueQuoted._sum.totalPrice || 0)}</p>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<span>Stale inquiries (&gt;{range.days}d)</span>
							<span className={cn("font-semibold", staleInquiries > 0 && "text-destructive")}>{staleInquiries}</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Operations watch</CardTitle>
						<CardDescription>Delivery risks that need quick action.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2.5 text-sm">
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<Clock3 className="size-4 text-primary" />
								<span>Open trip tasks</span>
							</div>
							<span className="font-semibold">{openTaskCount}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span>Overdue trip tasks</span>
							</div>
							<span className={cn("font-semibold", overdueTaskCount > 0 && "text-destructive")}>{overdueTaskCount}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<CalendarClock className="size-4 text-primary" />
								<span>Departures in 7 days</span>
							</div>
							<span className="font-semibold">{departuresIn7Days}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span>Missing final payment date</span>
							</div>
							<span className={cn("font-semibold", missingFinalPayment > 0 && "text-destructive")}>{missingFinalPayment}</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Upcoming departures</CardTitle>
						<CardDescription>Next {range.days} days of booked and traveling trips.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{upcomingTrips.length === 0 ? (
							<p className="text-sm text-muted-foreground">No departures scheduled in the next {range.days} days.</p>
						) : (
							upcomingTrips.map((trip) => (
								<Link
									key={trip.id}
									href={`/trips/${trip.id}/overview`}
									className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40"
								>
									<div>
										<p className="font-medium leading-none">{trip.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{trip.client.firstName} {trip.client.lastName}
										</p>
									</div>
									<Badge variant={trip.startDate && new Date(trip.startDate) <= in7Days ? "destructive" : "outline"}>{formatDate(trip.startDate)}</Badge>
								</Link>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recently created trips</CardTitle>
						<CardDescription>New demand that entered the pipeline in the last {range.days} days.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{recentTrips.length === 0 ? (
							<p className="text-sm text-muted-foreground">No new trips in the last {range.days} days.</p>
						) : (
							recentTrips.map((trip) => (
								<Link
									key={trip.id}
									href={`/trips/${trip.id}`}
									className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40"
								>
									<div>
										<p className="font-medium leading-none">{trip.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{trip.client.firstName} {trip.client.lastName}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{trip.status}</Badge>
										<span className="text-xs text-muted-foreground">{formatDate(trip.createdAt)}</span>
									</div>
								</Link>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<TripFilters
				defaultQuery={q}
				defaultStatus={status}
			/>

			<div className="overflow-hidden rounded-lg border border-border">
				<TripsTable trips={trips} />
			</div>

			{totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href={pageHref(Math.max(1, page - 1))}
								aria-disabled={page === 1}
								className={page === 1 ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<PaginationItem key={p}>
								<PaginationLink
									href={pageHref(p)}
									isActive={p === page}
								>
									{p}
								</PaginationLink>
							</PaginationItem>
						))}
						<PaginationItem>
							<PaginationNext
								href={pageHref(Math.min(totalPages, page + 1))}
								aria-disabled={page === totalPages}
								className={page === totalPages ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
}
