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
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Create booking</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">New trip</h1>
				<p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
					Start a new booking workspace for a client, define travel timing, and capture the commercial baseline.
				</p>
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
