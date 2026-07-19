import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SegmentFormDialog } from "@/components/trips/segment-form-dialog";
import { SegmentCard } from "@/components/trips/segment-card";
import { formatDate } from "@/lib/format";

function utcDateKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function utcMidnight(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function ItineraryPage({ params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!trip) notFound();

  const segments = await prisma.tripSegment.findMany({
    where: { tripId },
    orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
  });

  const scheduled = segments.filter((s) => s.startDateTime);
  const unscheduled = segments.filter((s) => !s.startDateTime);

  const days = [];
  if (trip.startDate && trip.endDate) {
    const cursor = utcMidnight(trip.startDate);
    const endDay = utcMidnight(trip.endDate);
    let dayNum = 1;
    const dayKeys = new Set();
    while (cursor <= endDay) {
      const key = utcDateKey(cursor);
      dayKeys.add(key);
      days.push({
        key,
        label: `Day ${dayNum}`,
        date: new Date(cursor),
        segments: scheduled.filter((s) => utcDateKey(s.startDateTime) === key),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      dayNum++;
    }
    unscheduled.push(...scheduled.filter((s) => !dayKeys.has(utcDateKey(s.startDateTime))));
  } else if (scheduled.length > 0) {
    const uniqueKeys = [...new Set(scheduled.map((s) => utcDateKey(s.startDateTime)))];
    uniqueKeys.forEach((key, i) => {
      const daySegments = scheduled.filter((s) => utcDateKey(s.startDateTime) === key);
      days.push({ key, label: `Day ${i + 1}`, date: daySegments[0].startDateTime, segments: daySegments });
    });
  }

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
                  {day.segments.map((segment) => (
                    <SegmentCard key={segment.id} segment={segment} tripId={tripId} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {unscheduled.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Unscheduled</h3>
              <div className="space-y-2">
                {unscheduled.map((segment) => (
                  <SegmentCard key={segment.id} segment={segment} tripId={tripId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
