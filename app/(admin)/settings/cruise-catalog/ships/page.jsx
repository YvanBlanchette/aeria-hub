import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CatalogSearch } from "@/components/settings/catalog-search";
import { CruiseShipsTable } from "@/components/settings/cruise-ships-table";
import { CruiseShipFormDialog } from "@/components/settings/cruise-ship-form-dialog";

const PAGE_SIZE = 25;

export const metadata = {
	title: "Cruise Ships — ÆRIA Hub",
};

export default async function CruiseShipsPage({ searchParams }) {
	const params = (await searchParams) || {};
	const q = typeof params.q === "string" ? params.q : "";
	const page = Math.max(1, parseInt(params.page, 10) || 1);

	const where = q ? { name: { contains: q, mode: "insensitive" } } : {};

	const [total, ships, cruiseLines] = await Promise.all([
		prisma.cruiseShip.count({ where }),
		prisma.cruiseShip.findMany({
			where,
			orderBy: { name: "asc" },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: { supplier: { select: { id: true, name: true } } },
		}),
		prisma.supplier.findMany({ where: { category: "CRUISE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const pageHref = (targetPage) =>
		q ? `/settings/cruise-catalog/ships?q=${encodeURIComponent(q)}&page=${targetPage}` : `/settings/cruise-catalog/ships?page=${targetPage}`;

	return (
		<div className="space-y-4">
			<Card className="p-0">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Cruise ships ({total})</CardTitle>
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<CatalogSearch
							defaultQuery={q}
							placeholder="Search ships..."
						/>
						<CruiseShipFormDialog cruiseLines={cruiseLines} />
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<CruiseShipsTable
						ships={ships}
						cruiseLines={cruiseLines}
					/>
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
						{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
							<PaginationItem key={number}>
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
