import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripTabNav } from "@/components/trips/trip-tab-nav";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { formatDate } from "@/lib/format";

const STATUS_VARIANT = {
  INQUIRY: "secondary",
  QUOTED: "secondary",
  BOOKED: "default",
  TRAVELING: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function TripLayout({ children, params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      name: true,
      destination: true,
      startDate: true,
      endDate: true,
      status: true,
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!trip) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{trip.name}</h1>
            <Badge variant={STATUS_VARIANT[trip.status] || "secondary"}>{trip.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.destination} ·{" "}
            <Link href={`/clients/${trip.client.id}`} className="hover:underline">
              {trip.client.firstName} {trip.client.lastName}
            </Link>
            {trip.startDate && ` · ${formatDate(trip.startDate)}${trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/trips/${trip.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <DeleteTripButton tripId={trip.id} clientId={trip.client.id} tripName={trip.name} />
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <TripTabNav tripId={trip.id} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
