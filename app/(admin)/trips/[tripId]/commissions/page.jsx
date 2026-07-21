import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentCommission } from "@/components/trips/segment-commission";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";

export default async function TripCommissionsPage({ params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) notFound();

  const segments = await prisma.tripSegment.findMany({
    where: { tripId, commissions: { some: {} } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { commissions: { orderBy: { createdAt: "asc" } }, supplier: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Commissions</h2>
        <p className="text-sm text-muted-foreground">Commission portions for this trip's segments.</p>
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No commissions set yet. Add one from a segment on the Itinerary tab.
        </p>
      ) : (
        <div className="space-y-2">
          {segments.map((segment) => {
            const meta = SEGMENT_TYPE_MAP[segment.type] || SEGMENT_TYPE_MAP.OTHER;
            const Icon = meta.icon;
            return (
              <Card key={segment.id}>
                <CardContent className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <p className="font-medium">{segment.title}</p>
                    <span className="text-sm text-muted-foreground">· {meta.label}</span>
                    {segment.supplier && (
                      <span className="text-sm text-muted-foreground">· {segment.supplier.name}</span>
                    )}
                  </div>
                  <SegmentCommission segment={segment} tripId={tripId} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
