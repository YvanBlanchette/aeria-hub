import Link from "next/link";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommissionReceivedToggle } from "@/components/trips/commission-received-toggle";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Commissions — ÆRIA Hub",
};

export default async function CommissionsPage() {
  const portions = await prisma.segmentCommission.findMany({
    orderBy: { dueDate: "asc" },
    include: {
      segment: {
        select: {
          id: true,
          title: true,
          type: true,
          provider: true,
          trip: {
            select: {
              id: true,
              name: true,
              endDate: true,
              client: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const totalPending = portions.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
  const totalReceived = portions.filter((p) => p.status === "RECEIVED").reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = portions.filter((p) => p.status === "PENDING" && p.dueDate && new Date(p.dueDate) < now).length;

  const tripGroups = new Map();
  for (const portion of portions) {
    const tripId = portion.segment.trip.id;
    if (!tripGroups.has(tripId)) {
      tripGroups.set(tripId, { trip: portion.segment.trip, portions: [] });
    }
    tripGroups.get(tripId).portions.push(portion);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground">Commission summary by trip, from segments across every booking.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={formatCurrency(totalPending)} icon={Clock} />
        <StatCard label="Received" value={formatCurrency(totalReceived)} icon={CheckCircle2} />
        <StatCard label="Overdue portions" value={overdueCount} icon={AlertTriangle} />
      </div>

      {tripGroups.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          No commissions set yet. Add one from a segment on a trip's Itinerary tab.
        </p>
      ) : (
        <div className="space-y-4">
          {[...tripGroups.values()].map(({ trip, portions }) => {
            const tripTotal = portions.reduce((sum, p) => sum + p.amount, 0);
            const tripPending = portions.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);

            return (
              <Card key={trip.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/trips/${trip.id}/itinerary`} className="font-medium hover:underline">
                        {trip.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        <Link href={`/clients/${trip.client.id}`} className="hover:underline">
                          {trip.client.firstName} {trip.client.lastName}
                        </Link>
                        {trip.endDate ? ` · Returns ${formatDate(trip.endDate)}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{formatCurrency(tripTotal)} total</p>
                      {tripPending > 0 && <p className="text-muted-foreground">{formatCurrency(tripPending)} pending</p>}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    {portions.map((p) => {
                      const overdue = p.status === "PENDING" && p.dueDate && new Date(p.dueDate) < now;
                      return (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-medium">{p.segment.title}</span>
                            <span className="text-muted-foreground"> · {formatCurrency(p.amount)}</span>
                            {p.dueDate && (
                              <span className={cn("text-muted-foreground", overdue && "text-destructive")}>
                                {" "}
                                · due {formatDate(p.dueDate)}
                                {overdue ? " · Overdue" : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={p.status === "RECEIVED" ? "default" : overdue ? "destructive" : "secondary"}>
                              {p.status === "RECEIVED" ? "Received" : "Pending"}
                            </Badge>
                            <CommissionReceivedToggle portion={p} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
