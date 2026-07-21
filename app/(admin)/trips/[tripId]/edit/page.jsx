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
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Trip maintenance</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Edit trip</h1>
				<p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
					Update {trip.name} and keep itinerary, billing, and departure readiness aligned.
				</p>
			</div>
			<TripForm
				action={boundUpdateTrip}
				trip={trip}
				clients={clients}
				submitLabel="Save changes"
			/>
		</div>
	);
}
