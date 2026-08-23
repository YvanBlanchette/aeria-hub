import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CatalogSearch } from "@/components/settings/catalog-search";
import { CruisePortsTable } from "@/components/settings/cruise-ports-table";
import { CruisePortFormDialog } from "@/components/settings/cruise-port-form-dialog";

const PAGE_SIZE = 25;

export const metadata = {
	title: "Cruise Ports — ÆRIA Hub",
};

export default async function CruisePortsPage({ searchParams }) {
	const params = (await searchParams) || {};
	const q = typeof params.q === "string" ? params.q : "";
	const page = Math.max(1, parseInt(params.page, 10) || 1);

	const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { country: { contains: q, mode: "insensitive" } }] } : {};

	const [total, ports] = await Promise.all([
		prisma.cruisePort.count({ where }),
		prisma.cruisePort.findMany({
			where,
			orderBy: [{ name: "asc" }, { country: "asc" }],
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const pageHref = (targetPage) =>
		q ? `/settings/cruise-catalog/ports?q=${encodeURIComponent(q)}&page=${targetPage}` : `/settings/cruise-catalog/ports?page=${targetPage}`;

	return (
		<div className="space-y-4">
			<Card className="p-0">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Cruise ports ({total})</CardTitle>
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<CatalogSearch
							defaultQuery={q}
							placeholder="Search ports or countries..."
						/>
						<CruisePortFormDialog />
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<CruisePortsTable ports={ports} />
				</CardContent>
			</Card>

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
						{Array.from({ length: totalPages }, (_, index) => index + 1)
							.filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 2)
							.map((number, idx, arr) => (
								<PaginationItem key={number}>
									{idx > 0 && arr[idx - 1] !== number - 1 && <span className="px-1 text-muted-foreground">…</span>}
									<PaginationLink
										href={pageHref(number)}
										isActive={number === page}
									>
										{number}
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
