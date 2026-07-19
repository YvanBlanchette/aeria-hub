import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SegmentFormDialog } from "@/components/trips/segment-form-dialog";
import { SegmentCard } from "@/components/trips/segment-card";
import { groupSegmentsByDay } from "@/lib/trip-segments";
import { formatDate } from "@/lib/format";

export default async function ItineraryPage({ params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!trip) notFound();

  const segments = await prisma.tripSegment.findMany({
    where: { tripId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { documents: true },
  });

  const { days, unscheduled } = groupSegmentsByDay(segments, trip);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            Flights, hotels, cruises, transfers, excursions, car rentals, insurance, and more.
          </p>
        </div>
        <SegmentFormDialog tripId={tripId} />
      </div>

      {segments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No segments yet. Add the first one to start building this trip's itinerary.
        </p>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <div key={day.key} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {day.label} <span className="font-normal text-muted-foreground">— {formatDate(day.date)}</span>
              </h3>
              {day.segments.length === 0 ? (
                <p className="text-sm italic text-muted-foreground/70">Nothing scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {day.segments.map((segment, index) => (
                    <SegmentCard
                      key={segment.id}
                      segment={segment}
                      tripId={tripId}
                      canMoveUp={index > 0}
                      canMoveDown={index < day.segments.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {unscheduled.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Unscheduled</h3>
              <div className="space-y-2">
                {unscheduled.map((segment, index) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    tripId={tripId}
                    canMoveUp={index > 0}
                    canMoveDown={index < unscheduled.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
