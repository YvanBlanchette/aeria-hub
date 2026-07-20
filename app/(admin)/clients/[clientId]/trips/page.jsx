import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

const statusVariant = {
  INQUIRY: "secondary",
  QUOTED: "secondary",
  BOOKED: "default",
  TRAVELING: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function ClientTripsPage({ params }) {
  const { clientId } = await params;

  const [primaryTrips, companionLinks] = await Promise.all([
    prisma.trip.findMany({
      where: { clientId },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { segments: true } } },
    }),
    prisma.tripClient.findMany({
      where: { clientId },
      include: { trip: { include: { _count: { select: { segments: true } } } } },
    }),
  ]);

  const trips = [
    ...primaryTrips.map((trip) => ({ ...trip, isCompanion: false })),
    ...companionLinks.map(({ trip }) => ({ ...trip, isCompanion: true })),
  ].sort((a, b) => new Date(b.startDate ?? 0) - new Date(a.startDate ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trips</h2>
        <Button size="sm" asChild>
          <Link href={`/trips/new?clientId=${clientId}`}>
            <Plus className="size-4" />
            New Trip
          </Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trips on record for this client.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{trip.name}</p>
                      {trip.isCompanion && (
                        <Badge variant="outline" className="text-[10px]">
                          Companion
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {trip.destination} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      {trip._count.segments > 0 && ` · ${trip._count.segments} segment${trip._count.segments === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {trip.totalPrice != null && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(trip.totalPrice)}
                      </span>
                    )}
                    <Badge variant={statusVariant[trip.status] || "secondary"}>{trip.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
