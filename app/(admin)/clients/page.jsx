import Link from "next/link";
import { Plus, Users, UserCheck, UserPlus2, Luggage } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { LocaleText } from "@/components/i18n/locale-text";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsTable } from "@/components/clients/clients-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
	title: "Clients — ÆRIA Hub",
};

export default async function ClientsPage({ searchParams }) {
	/* URL FILTERS */
	// Read the query string server-side so the client list can be filtered before render.
	const params = await searchParams;
	const q = typeof params?.q === "string" ? params.q : "";

	// Prisma uses this `where` object for the main client list. When there is no search query,
	// the empty object intentionally returns every client.
	const where = q
		? {
				OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { primaryEmail: { contains: q } }, { secondaryEmail: { contains: q } }],
			}
		: {};

	/* MONTHLY METRIC WINDOW */
	// Used by the stat cards to count clients created since the beginning of the current month.
	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	/* PAGE DATA */
	// Fetch the table rows and high-level counters in parallel. This keeps the page responsive
	// while still rendering all data on the server.
	const [clients, totalClients, activeClients, newThisMonth, totalTravelers] = await Promise.all([
		prisma.client.findMany({
			where,
			orderBy: { createdAt: "desc" },
			include: {
				// Portal state feeds the small access toggle in the clients table.
				portalUser: { select: { portalEnabled: true } },
				// Only active/traveling bookings count toward the active booking column.
				_count: {
					select: { trips: { where: { status: { in: ["BOOKED", "TRAVELING"] } } } },
				},
			},
		}),
		prisma.client.count(),
		prisma.client.count({ where: { status: "ACTIVE" } }),
		prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
		prisma.traveler.count(),
	]);

	/* CLIENT SPEND TOTALS */
	// Payments live on trips, not invoices. Sum non-cancelled trip payments per client so the
	// table reflects the true amount collected from each household.
	const clientIds = clients.map((client) => client.id);
	const payments = clientIds.length
		? await prisma.tripPayment.findMany({
				where: { cancelled: false, trip: { clientId: { in: clientIds } } },
				select: { amount: true, trip: { select: { clientId: true } } },
			})
		: [];
	const spentByClient = payments.reduce((totals, payment) => {
		const clientId = payment.trip.clientId;
		totals[clientId] = (totals[clientId] || 0) + payment.amount;
		return totals;
	}, {});

	return (
		<div className="space-y-6">
			{/* SUMMARY STATS */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label={
						<LocaleText
							messageKey="clients.totalClients"
							fallback="Total clients"
						/>
					}
					value={totalClients}
					icon={Users}
				/>
				<StatCard
					label={
						<LocaleText
							messageKey="clients.activeClients"
							fallback="Active clients"
						/>
					}
					value={activeClients}
					icon={UserCheck}
				/>
				<StatCard
					label={
						<LocaleText
							messageKey="clients.newThisMonth"
							fallback="New this month"
						/>
					}
					value={newThisMonth}
					icon={UserPlus2}
				/>
				<StatCard
					label={
						<LocaleText
							messageKey="clients.totalTravelers"
							fallback="Total travelers"
						/>
					}
					value={totalTravelers}
					icon={Luggage}
				/>
			</div>

			{/* CLIENT TABLE */}
			<Card className="p-0">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Clients</CardTitle>
					<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
						{/* Search controls preserve the query in the URL, which feeds the server filter above. */}
						<ClientFilters defaultQuery={q} />
						<div className="flex items-center justify-end gap-2">
							<Button asChild>
								<Link href="/clients/new">
									<Plus className="size-4" />
									<LocaleText
										messageKey="clients.new"
										fallback="New Client"
									/>
								</Link>
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{/* The table handles sorting locally; rows and payment totals come from the server. */}
					<ClientsTable
						clients={clients}
						spentByClient={spentByClient}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
