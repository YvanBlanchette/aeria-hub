import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

const statusVariant = {
  INQUIRY: "secondary",
  QUOTED: "secondary",
  BOOKED: "default",
  TRAVELING: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function TripsPage({ params }) {
  const { clientId } = await params;

  const trips = await prisma.trip.findMany({
    where: { clientId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trips</h2>
        <p className="text-xs text-muted-foreground">Trip management arrives in a later phase.</p>
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
            <Card key={trip.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{trip.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.destination} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
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
          ))}
        </div>
      )}
    </div>
  );
}
