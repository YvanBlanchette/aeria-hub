import Link from "next/link";
import { Plus, Plane, CheckCircle2, CalendarClock, DollarSign } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { TripFilters } from "@/components/trips/trip-filters";
import { TripsTable } from "@/components/trips/trips-table";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Trips — ÆRIA Hub",
};

const PAGE_SIZE = 10;

export default async function TripsPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q : "";
  const status = typeof params?.status === "string" ? params.status : "";
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
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [total, trips, totalTrips, activeTrips, upcomingDepartures, totalValue] = await Promise.all([
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
    prisma.trip.count({ where: { startDate: { gte: now, lte: in30Days }, status: { in: ["BOOKED", "TRAVELING"] } } }),
    prisma.trip.aggregate({ _sum: { totalPrice: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(targetPage));
    return `/trips?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">Bookings and itineraries across every client.</p>
        </div>
        <Button asChild>
          <Link href="/trips/new">
            <Plus className="size-4" />
            New Trip
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total trips" value={totalTrips} icon={Plane} />
        <StatCard label="Active bookings" value={activeTrips} icon={CheckCircle2} />
        <StatCard label="Upcoming departures" value={upcomingDepartures} icon={CalendarClock} />
        <StatCard label="Total value" value={formatCurrency(totalValue._sum.totalPrice || 0)} icon={DollarSign} />
      </div>

      <TripFilters defaultQuery={q} defaultStatus={status} />

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
                <PaginationLink href={pageHref(p)} isActive={p === page}>
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
