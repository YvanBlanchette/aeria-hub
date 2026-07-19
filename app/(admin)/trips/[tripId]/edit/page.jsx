import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TripForm } from "@/components/trips/trip-form";
import { updateTrip } from "../../actions";

export const metadata = {
  title: "Edit Trip — ÆRIA Hub",
};

export default async function EditTripPage({ params }) {
  const { tripId } = await params;

  const [trip, clients] = await Promise.all([
    prisma.trip.findUnique({ where: { id: tripId } }),
    prisma.client.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, primaryEmail: true },
    }),
  ]);

  if (!trip) notFound();

  const boundUpdateTrip = updateTrip.bind(null, tripId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit trip</h1>
        <p className="text-sm text-muted-foreground">Update {trip.name}.</p>
      </div>
      <TripForm action={boundUpdateTrip} trip={trip} clients={clients} submitLabel="Save changes" />
    </div>
  );
}
