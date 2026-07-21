import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock3, Inbox, Plane, Receipt, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentClientsTable } from "@/components/dashboard/recent-clients-table";
import { DashboardTasksTable } from "@/components/dashboard/dashboard-tasks-table";
import { DashboardTripsTable } from "@/components/dashboard/dashboard-trips-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIVE_TRIP_STATUSES = ["BOOKED", "TRAVELING"];
const OPEN_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"];
const DASHBOARD_RANGE_OPTIONS = [
	{ value: "7d", label: "7D", days: 7 },
	{ value: "30d", label: "30D", days: 30 },
	{ value: "quarter", label: "Quarter", days: 90 },
];

const TRIP_STATUS_LABELS = {
	INQUIRY: "Inquiry",
	QUOTED: "Quoted",
	BOOKED: "Booked",
	TRAVELING: "Traveling",
	COMPLETED: "Completed",
	CANCELLED: "Cancelled",
};

export const metadata = {
	title: "Dashboard — ÆRIA Hub",
};

function resolveDashboardRange(value) {
	return DASHBOARD_RANGE_OPTIONS.find((option) => option.value === value) || DASHBOARD_RANGE_OPTIONS[1];
}

function createRangeHref(nextRange, params) {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params || {})) {
		if (key === "range") continue;
		if (typeof value === "string") sp.set(key, value);
	}
	sp.set("range", nextRange);
	return `/dashboard?${sp.toString()}`;
}

export default async function DashboardPage({ searchParams }) {
	const params = (await searchParams) || {};
	const range = resolveDashboardRange(typeof params?.range === "string" ? params.range : "30d");
	const user = await requireUser();
	const now = new Date();
	const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const rangeEnd = new Date(now.getTime() + range.days * 24 * 60 * 60 * 1000);
	const startOfMonth = new Date(now);
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);

	const [
		totalClients,
		activeClients,
		newClientsThisMonth,
		activeBookings,
		upcomingDepartures,
		pendingTasksCount,
		overdueTasksCount,
		unpaidInvoices,
		overdueInvoices,
		newInquiries,
		inquiriesByStatus,
		tripStatusCounts,
		invoiceOpenSums,
		invoicePaidThisMonth,
		recentClients,
		openTasks,
		recentTrips,
		upcomingTrips,
		upcomingReminders,
		overdueReminders,
		dueSoonReminders,
		recentActivity,
	] = await Promise.all([
		prisma.client.count(),
		prisma.client.count({ where: { status: "ACTIVE" } }),
		prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
		prisma.trip.count({ where: { status: { in: ACTIVE_TRIP_STATUSES } } }),
		prisma.trip.count({
			where: {
				startDate: { gte: now, lte: rangeEnd },
				status: { in: ACTIVE_TRIP_STATUSES },
			},
		}),
		prisma.tripTask.count({ where: { completed: false } }),
		prisma.tripTask.count({ where: { completed: false, dueDate: { lt: now } } }),
		prisma.invoice.count({ where: { status: { in: OPEN_INVOICE_STATUSES } } }),
		prisma.invoice.count({ where: { status: "OVERDUE" } }),
		prisma.inquiry.count({ where: { status: "NEW" } }),
		prisma.inquiry.groupBy({ by: ["status"], _count: { status: true } }),
		prisma.trip.groupBy({ by: ["status"], _count: { status: true } }),
		prisma.invoice.aggregate({
			where: { status: { in: OPEN_INVOICE_STATUSES } },
			_sum: { amount: true, amountPaid: true },
		}),
		prisma.invoice.aggregate({
			where: { status: "PAID", updatedAt: { gte: startOfMonth } },
			_sum: { amountPaid: true },
		}),
		prisma.client.findMany({
			orderBy: { createdAt: "desc" },
			take: 6,
			select: { id: true, firstName: true, lastName: true, primaryEmail: true, primaryPhone: true, status: true, createdAt: true },
		}),
		prisma.tripTask.findMany({
			where: { completed: false, dueDate: { not: null } },
			orderBy: [{ dueDate: "asc" }],
			take: 8,
			include: { trip: { select: { id: true, name: true } } },
		}),
		prisma.trip.findMany({
			orderBy: { createdAt: "desc" },
			take: 6,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.trip.findMany({
			where: { startDate: { gte: now, lte: rangeEnd }, status: { in: ACTIVE_TRIP_STATUSES } },
			orderBy: { startDate: "asc" },
			take: 6,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.reminder.findMany({
			where: { completed: false, dueDate: { gte: now, lte: rangeEnd } },
			orderBy: { dueDate: "asc" },
			take: 8,
			include: { client: { select: { id: true, firstName: true, lastName: true } } },
		}),
		prisma.reminder.count({ where: { completed: false, dueDate: { lt: now } } }),
		prisma.reminder.count({ where: { completed: false, dueDate: { gte: now, lte: in7Days } } }),
		prisma.activityLog.findMany({
			orderBy: { createdAt: "desc" },
			take: 8,
			include: {
				user: { select: { name: true } },
				client: { select: { id: true, firstName: true, lastName: true } },
			},
		}),
	]);

	const firstName = user.name?.trim()?.split(" ")?.[0] || "there";
	const openInvoiceAmount = (invoiceOpenSums._sum.amount || 0) - (invoiceOpenSums._sum.amountPaid || 0);
	const paidThisMonth = invoicePaidThisMonth._sum.amountPaid || 0;
	const tripStatusMap = new Map(tripStatusCounts.map((entry) => [entry.status, entry._count.status]));
	const inquiryStatusMap = new Map(inquiriesByStatus.map((entry) => [entry.status, entry._count.status]));
	const totalTrips = [...tripStatusMap.values()].reduce((sum, count) => sum + count, 0);

	const pipelineOrder = ["INQUIRY", "QUOTED", "BOOKED", "TRAVELING", "COMPLETED"];
	const pipelineRows = pipelineOrder.map((status) => {
		const count = tripStatusMap.get(status) || 0;
		const pct = totalTrips ? Math.round((count / totalTrips) * 100) : 0;
		return { status, label: TRIP_STATUS_LABELS[status], count, pct };
	});

	return (
		<div className="space-y-6">
			{/* HERO */}
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-2xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Operations overview</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Welcome back, {firstName}</h1>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground">
							Your daily command center for sales, service, departures, and the next decisions that matter.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:items-end">
						{/* TIME RANGE */}
						<div className="flex items-center gap-1 rounded-full border border-border bg-background/70 p-1 shadow-sm backdrop-blur">
							{DASHBOARD_RANGE_OPTIONS.map((option) => (
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
						<div className="flex flex-wrap items-center justify-end gap-2">
							<Button asChild>
								<Link href="/clients/new">New Client</Link>
							</Button>
							<Button
								variant="outline"
								asChild
							>
								<Link href="/trips/new">New Trip</Link>
							</Button>
							<Button
								variant="outline"
								asChild
							>
								<Link href="/commissions">Commissions</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* KPI GRID */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Total clients"
					value={totalClients}
					icon={Users}
				/>
				<StatCard
					label="Active clients"
					value={activeClients}
					icon={CheckCircle2}
				/>
				<StatCard
					label="New clients this month"
					value={newClientsThisMonth}
					icon={Inbox}
				/>
				<StatCard
					label="Active bookings"
					value={activeBookings}
					icon={Plane}
				/>
				<StatCard
					label="Upcoming departures"
					value={upcomingDepartures}
					icon={CalendarClock}
				/>
				<StatCard
					label="Open tasks"
					value={pendingTasksCount}
					icon={Clock3}
				/>
				<StatCard
					label="Open invoices"
					value={unpaidInvoices}
					icon={Receipt}
				/>
				<StatCard
					label="New inquiries"
					value={newInquiries}
					icon={Inbox}
				/>
			</div>

			{/* OPERATIONS SNAPSHOT */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Trip pipeline</CardTitle>
						<CardDescription>Current status spread across all trips.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{pipelineRows.map((row) => (
							<div
								key={row.status}
								className="space-y-1.5"
							>
								<div className="flex items-center justify-between gap-2 text-sm">
									<div className="flex items-center gap-2">
										<span className="font-medium">{row.label}</span>
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
						<CardTitle>Revenue snapshot</CardTitle>
						<CardDescription>Cash movement and outstanding receivables.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding balance</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(openInvoiceAmount)}</p>
							<p className="mt-1 text-xs text-muted-foreground">Across {unpaidInvoices} open invoices</p>
						</div>
						<div className="rounded-lg border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Collected this month</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(paidThisMonth)}</p>
							<p className="mt-1 text-xs text-muted-foreground">Invoices marked paid since month start</p>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Overdue invoices</span>
							<span className={cn("font-medium", overdueInvoices > 0 && "text-destructive")}>{overdueInvoices}</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Today&apos;s focus</CardTitle>
						<CardDescription>What needs immediate attention first.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2.5 text-sm">
						<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span>Overdue tasks</span>
							</div>
							<span className={cn("font-semibold", overdueTasksCount > 0 && "text-destructive")}>{overdueTasksCount}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span>Overdue reminders</span>
							</div>
							<span className={cn("font-semibold", overdueReminders > 0 && "text-destructive")}>{overdueReminders}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
							<div className="flex items-center gap-2">
								<CalendarClock className="size-4 text-primary" />
								<span>Departures in 7 days</span>
							</div>
							<span className="font-semibold">{upcomingTrips.filter((trip) => trip.startDate && new Date(trip.startDate) <= in7Days).length}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
							<div className="flex items-center gap-2">
								<Clock3 className="size-4 text-primary" />
								<span>Reminders due this week</span>
							</div>
							<span className="font-semibold">{dueSoonReminders}</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* SERVICE + OPERATIONS QUEUES */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div>
							<CardTitle>Upcoming departures</CardTitle>
							<CardDescription>Next {range.days} days of active trips.</CardDescription>
						</div>
						<Button
							variant="ghost"
							size="sm"
							asChild
						>
							<Link href="/trips">
								View all
								<ArrowRight className="size-4" />
							</Link>
						</Button>
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
									<Badge variant="outline">{formatDate(trip.startDate)}</Badge>
								</Link>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div>
							<CardTitle>Client reminders</CardTitle>
							<CardDescription>Upcoming service commitments and renewals in the next {range.days} days.</CardDescription>
						</div>
						<Badge variant={overdueReminders > 0 ? "destructive" : "secondary"}>{overdueReminders} overdue</Badge>
					</CardHeader>
					<CardContent className="space-y-2">
						{upcomingReminders.length === 0 ? (
							<p className="text-sm text-muted-foreground">No pending reminders due in the next {range.days} days.</p>
						) : (
							upcomingReminders.map((reminder) => {
								const isUrgent = new Date(reminder.dueDate) <= in7Days;
								return (
									<Link
										key={reminder.id}
										href={`/clients/${reminder.client.id}/reminders`}
										className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/40"
									>
										<div>
											<p className="font-medium leading-none">{reminder.title}</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{reminder.client.firstName} {reminder.client.lastName}
											</p>
										</div>
										<Badge variant={isUrgent ? "destructive" : "outline"}>{formatDate(reminder.dueDate)}</Badge>
									</Link>
								);
							})
						)}
					</CardContent>
				</Card>
			</div>

			{/* CLIENTS TABLE */}
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 bg-sidebar py-2 text-sidebar-foreground">
					<CardTitle>Recent clients</CardTitle>
					<Button
						variant="secondary"
						size="sm"
						asChild
					>
						<Link href="/clients">Open clients</Link>
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					<RecentClientsTable clients={recentClients} />
				</CardContent>
			</Card>

			{/* WORK QUEUES */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="p-0 xl:col-span-2">
					<CardHeader className="bg-sidebar py-2 text-sidebar-foreground">
						<CardTitle>Open tasks</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<DashboardTasksTable tasks={openTasks} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Inquiry board</CardTitle>
						<CardDescription>Lead progression from intake to conversion.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						{["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].map((status) => (
							<div
								key={status}
								className="flex items-center justify-between rounded-lg border border-border p-2.5"
							>
								<span>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
								<Badge variant={status === "LOST" ? "destructive" : "secondary"}>{inquiryStatusMap.get(status) || 0}</Badge>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			{/* RECENT TRIPS + ACTIVITY */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card className="p-0">
					<CardHeader className="bg-sidebar py-2 text-sidebar-foreground">
						<CardTitle>Recently updated trips</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<DashboardTripsTable trips={recentTrips} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent activity</CardTitle>
						<CardDescription>Latest edits and changes across the CRM.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{recentActivity.length === 0 ? (
							<p className="text-sm text-muted-foreground">No activity logged yet.</p>
						) : (
							recentActivity.map((entry) => (
								<div
									key={entry.id}
									className="rounded-lg border border-border p-2.5"
								>
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{entry.description || `${entry.action} ${entry.entityType}`}</p>
										<span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{entry.user?.name || "System"}
										{entry.client ? (
											<>
												{" · "}
												<Link
													href={`/clients/${entry.client.id}`}
													className="underline-offset-2 hover:underline"
												>
													{entry.client.firstName} {entry.client.lastName}
												</Link>
											</>
										) : null}
									</p>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
