import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TripFilters } from "@/components/trips/trip-filters";
import { TripsTable } from "@/components/trips/trips-table";
import { ClientTripsTable } from "@/components/trips/client-trips-table";
import { LocaleText } from "@/components/i18n/locale-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { requireUser } from "@/lib/session";
import { getClientPortalRecord } from "@/lib/client-portal";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";
import { tripScope } from "@/lib/visibility-scope";
import { CrmCalendar } from "@/components/calendar/crm-calendar";

export const metadata = {
	title: "Trips | ÆRIA Hub",
};

const PAGE_SIZE = 25;
async function ClientTripsView({ user }) {
	const portal = await getClientPortalRecord(user);
	if (!portal) return <div className="p-6 text-muted-foreground">No client profile found for this account.</div>;

	const trips = [...(portal.client?.trips || [])].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
	return (
		<div className="space-y-6">
			<Card className="p-0">
				<CardHeader>
					<CardTitle>My trips</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<ClientTripsTable trips={trips} />
				</CardContent>
			</Card>
		</div>
	);
}

export default async function TripsPage({ searchParams }) {
	const user = await requireUser();
	if (user.role === "CLIENT") return ClientTripsView({ user });

	const params = (await searchParams) || {};
	const q = typeof params.q === "string" ? params.q : "";
	const page = Math.max(1, parseInt(params.page, 10) || 1);
	const scopedTrips = tripScope(user);
	const where = {
		...scopedTrips,
		...(q ? { OR: [{ name: { contains: q } }, { destination: { contains: q } }] } : {}),
	};

	const [calendarEvents, total, trips] = await Promise.all([
		buildCrmCalendarEvents({ user }),
		prisma.trip.count({ where }),
		prisma.trip.findMany({
			where,
			orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: {
				client: { select: { id: true, firstName: true, lastName: true } },
				segments: { select: { id: true } },
				tasks: { select: { completed: true, dueDate: true } },
				invoices: { select: { amount: true, amountPaid: true, status: true } },
				payments: { where: { cancelled: false }, select: { amount: true } },
			},
		}),
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const pageHref = (targetPage) => (q ? `/trips?q=${encodeURIComponent(q)}&page=${targetPage}` : `/trips?page=${targetPage}`);

	return (
		<div className="space-y-6">
			<CrmCalendar
				initialEvents={calendarEvents.filter((event) => event.type === "vacation")}
				currentUserId={user.id}
			/>
			<Card className="p-0">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Trips</CardTitle>
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<TripFilters defaultQuery={q} />
						<Button
							size="sm"
							asChild
						>
							<Link href="/trips/new">
								<Plus className="size-4" />
								<LocaleText
									messageKey="trips.new"
									fallback="New Trip"
								/>
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<TripsTable trips={trips} />
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
