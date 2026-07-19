import Link from "next/link";
import { Plane, CalendarClock, Receipt, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export const metadata = {
  title: "Dashboard — ÆRIA Hub",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [activeBookings, upcomingDepartures, unpaidInvoices, newInquiries, recentClients] =
    await Promise.all([
      prisma.trip.count({ where: { status: { in: ["BOOKED", "TRAVELING"] } } }),
      prisma.trip.count({
        where: {
          startDate: { gte: now, lte: in30Days },
          status: { in: ["BOOKED", "TRAVELING"] },
        },
      }),
      prisma.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
      prisma.inquiry.count({ where: { status: "NEW" } }),
      prisma.client.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening across ÆRIA Hub.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active bookings" value={activeBookings} icon={Plane} />
        <StatCard label="Upcoming departures" value={upcomingDepartures} icon={CalendarClock} />
        <StatCard label="Unpaid invoices" value={unpaidInvoices} icon={Receipt} />
        <StatCard label="New inquiries" value={newInquiries} icon={Inbox} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent clients</CardTitle>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentClients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-secondary text-xs">
                        {initials(`${client.firstName} ${client.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
