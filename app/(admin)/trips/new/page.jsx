import { prisma } from "@/lib/prisma";
import { TripForm } from "@/components/trips/trip-form";
import { createTrip } from "../actions";

export const metadata = {
  title: "New Trip — ÆRIA Hub",
};

export default async function NewTripPage({ searchParams }) {
  const params = await searchParams;
  const clientId = typeof params?.clientId === "string" ? params.clientId : undefined;

  const clients = await prisma.client.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, primaryEmail: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New trip</h1>
        <p className="text-sm text-muted-foreground">Start a booking for a client.</p>
      </div>
      <TripForm
        action={createTrip}
        trip={clientId ? { clientId } : undefined}
        clients={clients}
        lockClient={Boolean(clientId)}
        submitLabel="Create trip"
      />
    </div>
  );
}
