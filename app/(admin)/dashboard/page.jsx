import Link from "next/link";
import { CalendarClock, CheckCircle2, Clock3, Plane, Plus, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getClientPortalRecord, getClientOutstandingBalance, getNextDeparture, getNextPaymentDate } from "@/lib/client-portal";
import { tripScope, invoiceScope, taskScope, clientScope } from "@/lib/visibility-scope";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoiceOutstandingBalance } from "@/lib/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { RecentClientsTable } from "@/components/dashboard/recent-clients-table";
import { DashboardTripsTable } from "@/components/dashboard/dashboard-trips-table";

export const metadata = {
	title: "Dashboard — ÆRIA Hub",
};

async function ClientDashboardView({ user }) {
	const portal = await getClientPortalRecord(user);
	if (!portal) {
		return <div className="p-6 text-muted-foreground">Your account is not linked to a client profile yet.</div>;
	}

	const { client } = portal;
	const nextDeparture = getNextDeparture(client);
	const nextPaymentDate = getNextPaymentDate(client);
	const upcomingTrips = [...(client.trips || [])]
		.filter((trip) => trip.startDate && trip.status !== "CANCELLED")
		.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
		.slice(0, 4);

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Next departure"
					value={nextDeparture ? formatDate(nextDeparture) : "—"}
					icon={Plane}
				/>
				<StatCard
					label="Amount due"
					value={formatCurrency(getClientOutstandingBalance(client))}
					icon={Receipt}
				/>
				<StatCard
					label="Next payment"
					value={nextPaymentDate ? formatDate(nextPaymentDate) : "—"}
					icon={CalendarClock}
				/>
				<StatCard
					label="Trips booked"
					value={client.trips?.length || 0}
					icon={CheckCircle2}
				/>
			</div>

			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle>Upcoming trips</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						asChild
					>
						<Link href="/trips">View all</Link>
					</Button>
				</CardHeader>
				<CardContent className="space-y-2 p-3">
					{upcomingTrips.length === 0 ? (
						<p className="p-3 text-sm text-muted-foreground">No upcoming trips are scheduled.</p>
					) : (
						upcomingTrips.map((trip) => (
							<Link
								key={trip.id}
								href={`/trips/${trip.id}/overview`}
								className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40"
							>
								<div>
									<p className="font-medium">{trip.name}</p>
									<p className="text-xs text-muted-foreground">{trip.destination}</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-sm text-muted-foreground">{formatDate(trip.startDate)}</span>
									<Badge>{trip.status}</Badge>
								</div>
							</Link>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default async function DashboardPage() {
	const user = await requireUser();
	if (user.role === "CLIENT") return ClientDashboardView({ user });

	const now = new Date();
	const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	const scopedTrips = tripScope(user);
	const scopedInvoices = invoiceScope(user);
	const scopedTasks = taskScope(user);

	const [activeBookings, departuresIn30Days, openInvoices, openTasks, recentClients, recentTripViews] = await Promise.all([
		prisma.trip.count({ where: { ...scopedTrips, status: { in: ["BOOKED", "TRAVELING"] } } }),
		prisma.trip.count({
			where: { ...scopedTrips, startDate: { gte: now, lte: horizon }, status: { in: ["BOOKED", "TRAVELING"] } },
		}),
		prisma.invoice.findMany({
			where: { ...scopedInvoices, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
			select: { amount: true, amountPaid: true, trip: { select: { payments: { where: { cancelled: false }, select: { amount: true } } } } },
		}),
		prisma.tripTask.count({ where: { ...scopedTasks, completed: false } }),
		prisma.client.findMany({
			where: clientScope(user),
			orderBy: { createdAt: "desc" },
			take: 10,
			select: { id: true, firstName: true, lastName: true, primaryEmail: true, primaryPhone: true, status: true, createdAt: true },
		}),
		prisma.recentView.findMany({
			where: { userId: user.id, entityType: "Trip" },
			orderBy: { viewedAt: "desc" },
			take: 10,
			select: { entityId: true },
		}),
	]);
	const recentTripIds = recentTripViews.map((view) => view.entityId);
	const recentTripRows = recentTripIds.length
		? await prisma.trip.findMany({
				where: { ...tripScope(user), id: { in: recentTripIds } },
				include: { client: { select: { id: true, firstName: true, lastName: true } } },
			})
		: [];
	const recentTrips = recentTripIds.map((id) => recentTripRows.find((trip) => trip.id === id)).filter(Boolean);

	const openBalance = openInvoices.reduce((sum, invoice) => sum + getInvoiceOutstandingBalance(invoice), 0);
	return (
		<div className="flex min-h-0 flex-col gap-4 overflow-hidden">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Operations overview</p>
					<h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
				</div>
				<div className="flex gap-2">
					<Button asChild>
						<Link href="/clients/new">
							<Plus className="size-4" />
							New client
						</Link>
					</Button>
					<Button
						variant="outline"
						asChild
					>
						<Link href="/trips/new">
							<Plus className="size-4" />
							New trip
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Active bookings"
					value={activeBookings}
					icon={Plane}
				/>
				<StatCard
					label="Departures in 30 days"
					value={departuresIn30Days}
					icon={CalendarClock}
				/>
				<StatCard
					label="Open invoice balance"
					value={formatCurrency(openBalance)}
					icon={Receipt}
				/>
				<StatCard
					label="Open tasks"
					value={openTasks}
					icon={Clock3}
				/>
			</div>

			<div className="grid min-h-0 gap-4 xl:grid-cols-2">
				<Card className="min-w-0 p-0">
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Recent clients</CardTitle>
						<Button
							variant="ghost"
							size="sm"
							asChild
						>
							<Link href="/clients">View all</Link>
						</Button>
					</CardHeader>
					<CardContent className="min-w-0 overflow-hidden p-0">
						<RecentClientsTable clients={recentClients} />
					</CardContent>
				</Card>

				<Card className="min-w-0 p-0">
					<CardHeader className="flex flex-row items-center justify-between gap-3">
						<CardTitle>Recent trips</CardTitle>
						<Button
							variant="ghost"
							size="sm"
							asChild
						>
							<Link href="/trips">View all</Link>
						</Button>
					</CardHeader>
					<CardContent className="min-w-0 overflow-hidden p-0">
						<DashboardTripsTable trips={recentTrips} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
