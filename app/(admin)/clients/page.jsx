import Link from "next/link";
import { Plus, Users, UserCheck, UserPlus2, Luggage } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { LocaleText } from "@/components/i18n/locale-text";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsTable } from "@/components/clients/clients-table";
import { ExportCsvMenu } from "@/components/clients/export-csv-menu";
import { ImportCsvDialog } from "@/components/clients/import-csv-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
	title: "Clients — ÆRIA Hub",
};

export default async function ClientsPage({ searchParams }) {
	const params = await searchParams;
	const q = typeof params?.q === "string" ? params.q : "";
	const where = q
		? {
				OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { primaryEmail: { contains: q } }, { secondaryEmail: { contains: q } }],
			}
		: {};

	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	const [clients, totalClients, activeClients, newThisMonth, totalTravelers] = await Promise.all([
		prisma.client.findMany({
			where,
			orderBy: { createdAt: "desc" },
			include: {
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

	const clientIds = clients.map((client) => client.id);
	const invoiceSums = clientIds.length
		? await prisma.invoice.groupBy({
				by: ["clientId"],
				where: { clientId: { in: clientIds } },
				_sum: { amountPaid: true },
			})
		: [];
	const spentByClient = Object.fromEntries(invoiceSums.map((sum) => [sum.clientId, sum._sum.amountPaid || 0]));

	return (
		<div className="space-y-6">
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

			<Card className="p-0">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Clients</CardTitle>
					<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
						<ClientFilters defaultQuery={q} />
						<div className="flex items-center justify-end gap-2">
							<ImportCsvDialog />
							<ExportCsvMenu />
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
					<ClientsTable
						clients={clients}
						spentByClient={spentByClient}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
