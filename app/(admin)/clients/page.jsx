import Link from "next/link";
import { Plus, Users, UserCheck, UserPlus2, Luggage } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsTable } from "@/components/clients/clients-table";
import { ExportCsvMenu } from "@/components/clients/export-csv-menu";
import { ImportCsvDialog } from "@/components/clients/import-csv-dialog";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export const metadata = {
	title: "Clients — ÆRIA Hub",
};

const PAGE_SIZE = 11;

export default async function ClientsPage({ searchParams }) {
	const params = await searchParams;
	const q = typeof params?.q === "string" ? params.q : "";
	const status = typeof params?.status === "string" ? params.status : "";
	const page = Math.max(1, parseInt(params?.page, 10) || 1);

	const where = {
		...(status ? { status } : {}),
		...(q
			? {
					OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { primaryEmail: { contains: q } }, { secondaryEmail: { contains: q } }],
				}
			: {}),
	};

	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	const [total, clients, totalClients, activeClients, newThisMonth, totalTravelers] = await Promise.all([
		prisma.client.count({ where }),
		prisma.client.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
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

	const clientIds = clients.map((c) => c.id);
	const invoiceSums = clientIds.length
		? await prisma.invoice.groupBy({
				by: ["clientId"],
				where: { clientId: { in: clientIds } },
				_sum: { amountPaid: true },
			})
		: [];
	const spentByClient = Object.fromEntries(invoiceSums.map((s) => [s.clientId, s._sum.amountPaid || 0]));

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	function pageHref(targetPage) {
		const sp = new URLSearchParams();
		if (q) sp.set("q", q);
		if (status) sp.set("status", status);
		sp.set("page", String(targetPage));
		return `/clients?${sp.toString()}`;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
					<p className="text-sm text-muted-foreground">Households and travelers you work with.</p>
				</div>
				<div className="flex items-center gap-2">
					<ImportCsvDialog />
					<ExportCsvMenu />
					<Button asChild>
						<Link href="/clients/new">
							<Plus className="size-4" />
							New Client
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Total clients"
					value={totalClients}
					icon={Users}
				/>
				<StatCard
					label="Active clients"
					value={activeClients}
					icon={UserCheck}
				/>
				<StatCard
					label="New this month"
					value={newThisMonth}
					icon={UserPlus2}
				/>
				<StatCard
					label="Total travelers"
					value={totalTravelers}
					icon={Luggage}
				/>
			</div>

			<div className="flex w-full items-center justify-end">
				<ClientFilters
					defaultQuery={q}
					defaultStatus={status}
				/>
			</div>

			<div className="overflow-hidden rounded-lg border border-border">
				<ClientsTable clients={clients} spentByClient={spentByClient} />
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
