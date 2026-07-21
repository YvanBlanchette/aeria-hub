import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

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
	return `/commissions?${sp.toString()}`;
}

export const metadata = {
	title: "Commissions — ÆRIA Hub",
};

export default async function CommissionsPage({ searchParams }) {
	const params = (await searchParams) || {};
	const range = resolveRange(typeof params?.range === "string" ? params.range : DEFAULT_RANGE);

	const segments = await prisma.tripSegment.findMany({
		where: { commissions: { some: {} } },
		select: {
			trip: {
				select: {
					id: true,
					name: true,
					createdAt: true,
					client: { select: { firstName: true, lastName: true } },
				},
			},
			commissions: { select: { amount: true, dueDate: true, status: true } },
		},
	});

	const now = new Date();
	const horizonEnd = new Date(now.getTime() + range.days * 24 * 60 * 60 * 1000);
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const monthHorizon = new Date(Date.UTC(horizonEnd.getUTCFullYear(), horizonEnd.getUTCMonth() + 1, 1));

	const [upcomingPortions, receivedThisMonth] = await Promise.all([
		prisma.segmentCommission.findMany({
			where: {
				status: "PENDING",
				dueDate: { not: null, gte: now, lte: horizonEnd },
			},
			orderBy: { dueDate: "asc" },
			take: 12,
			select: {
				id: true,
				amount: true,
				dueDate: true,
				segment: {
					select: {
						title: true,
						trip: {
							select: {
								id: true,
								name: true,
								client: { select: { firstName: true, lastName: true } },
							},
						},
					},
				},
			},
		}),
		prisma.segmentCommission.aggregate({
			where: { status: "RECEIVED", receivedDate: { gte: monthStart } },
			_sum: { amount: true },
		}),
	]);

	let totalPending = 0;
	let totalReceived = 0;
	let overdueCount = 0;
	let dueInRangeAmount = 0;

	const monthBuckets = new Map();
	let cursor = new Date(monthStart);
	while (cursor < monthHorizon) {
		const d = new Date(cursor);
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
		const label = d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
		monthBuckets.set(key, { key, label, amount: 0, count: 0 });
		cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
	}

	const tripMap = new Map();
	for (const s of segments) {
		const tripId = s.trip.id;
		if (!tripMap.has(tripId)) {
			tripMap.set(tripId, {
				tripId,
				tripName: s.trip.name,
				clientName: `${s.trip.client.firstName} ${s.trip.client.lastName}`,
				bookingDate: s.trip.createdAt,
				totalAmount: 0,
				dueDates: [],
				allReceived: true,
				anyReceived: false,
			});
		}
		const entry = tripMap.get(tripId);
		for (const c of s.commissions) {
			entry.totalAmount += c.amount;
			if (c.dueDate) entry.dueDates.push(c.dueDate);
			if (c.status === "RECEIVED") {
				entry.anyReceived = true;
				totalReceived += c.amount;
			} else {
				entry.allReceived = false;
				totalPending += c.amount;
				if (c.dueDate && new Date(c.dueDate) <= horizonEnd && new Date(c.dueDate) >= now) dueInRangeAmount += c.amount;
				if (c.dueDate && new Date(c.dueDate) < now) overdueCount++;

				if (c.dueDate) {
					const due = new Date(c.dueDate);
					if (due >= monthStart && due < monthHorizon) {
						const key = `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, "0")}`;
						const bucket = monthBuckets.get(key);
						if (bucket) {
							bucket.amount += c.amount;
							bucket.count += 1;
						}
					}
				}
			}
		}
	}

	const rows = [...tripMap.values()].map((entry) => {
		const sortedDates = entry.dueDates.slice().sort((a, b) => new Date(a) - new Date(b));
		const status = entry.allReceived ? "RECEIVED" : entry.anyReceived ? "PARTIAL" : "PENDING";
		return {
			tripId: entry.tripId,
			tripName: entry.tripName,
			clientName: entry.clientName,
			totalAmount: entry.totalAmount,
			paymentDate: sortedDates[0] ?? null,
			bookingDate: entry.bookingDate,
			status,
		};
	});

	const incomingByMonth = [...monthBuckets.values()];
	const maxIncomingMonthAmount = incomingByMonth.reduce((max, bucket) => Math.max(max, bucket.amount), 0);
	const receivedThisMonthAmount = receivedThisMonth._sum.amount || 0;

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-2xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Commission forecasting</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Commissions</h1>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground">One row per trip with a live forecast of incoming cashflow and due portions.</p>
					</div>
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
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					label="Pending"
					value={formatCurrency(totalPending)}
					icon={Clock}
				/>
				<StatCard
					label="Received"
					value={formatCurrency(totalReceived)}
					icon={CheckCircle2}
				/>
				<StatCard
					label="Overdue portions"
					value={overdueCount}
					icon={AlertTriangle}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader>
						<CardTitle>Incoming commissions forecast</CardTitle>
						<CardDescription>Pending amounts due by month over the next {range.days} days.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
							{incomingByMonth.map((bucket) => {
								const heightPct = maxIncomingMonthAmount > 0 ? Math.max(6, Math.round((bucket.amount / maxIncomingMonthAmount) * 100)) : 0;
								return (
									<div
										key={bucket.key}
										className="space-y-2 text-center"
									>
										<div className="h-32 rounded-md border border-border bg-muted/30 p-1">
											<div className="flex h-full items-end">
												<div
													className={cn("w-full rounded-sm bg-primary/80", bucket.amount === 0 && "bg-muted")}
													style={{ height: bucket.amount === 0 ? "8%" : `${heightPct}%` }}
													title={`${bucket.label}: ${formatCurrency(bucket.amount)} (${bucket.count} portions)`}
												/>
											</div>
										</div>
										<div>
											<p className="text-xs font-medium">{bucket.label}</p>
											<p className="text-[11px] text-muted-foreground">{formatCurrency(bucket.amount)}</p>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Cashflow watch</CardTitle>
						<CardDescription>Near-term payout timing and realized income.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2.5 text-sm">
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Due in {range.days} days</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(dueInRangeAmount)}</p>
						</div>
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Received this month</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(receivedThisMonthAmount)}</p>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<CalendarClock className="size-4 text-primary" />
								<span>Upcoming portions</span>
							</div>
							<span className="font-semibold">{upcomingPortions.length}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-3">
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span>Overdue portions</span>
							</div>
							<span className={cn("font-semibold", overdueCount > 0 && "text-destructive")}>{overdueCount}</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Due soon commission portions</CardTitle>
					<CardDescription>Pending portions with due dates in the next {range.days} days.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{upcomingPortions.length === 0 ? (
						<p className="text-sm text-muted-foreground">No pending portions due in the next {range.days} days.</p>
					) : (
						upcomingPortions.map((portion) => {
							const overdue = portion.dueDate && new Date(portion.dueDate) < now;
							return (
								<Link
									key={portion.id}
									href={`/trips/${portion.segment.trip.id}/commissions`}
									className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40"
								>
									<div>
										<p className="font-medium leading-none">{portion.segment.trip.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{portion.segment.trip.client.firstName} {portion.segment.trip.client.lastName} · {portion.segment.title}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={overdue ? "destructive" : "outline"}>{formatDate(portion.dueDate)}</Badge>
										<span className="text-sm font-semibold tabular-nums">{formatCurrency(portion.amount)}</span>
									</div>
								</Link>
							);
						})
					)}
				</CardContent>
			</Card>

			<CommissionsTable rows={rows} />
		</div>
	);
}
