import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ForfaitsWorkbench } from "@/components/forfaits/forfaits-workbench";

export const metadata = {
	title: "Forfaits - AERIA Hub",
};

export default async function ForfaitsPage() {
	const user = await requireUser();

	const [clients, trips, quotes] = await Promise.all([
		prisma.client.findMany({
			orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
			select: { id: true, firstName: true, lastName: true },
		}),
		prisma.trip.findMany({
			orderBy: [{ updatedAt: "desc" }],
			take: 300,
			select: {
				id: true,
				name: true,
				status: true,
				startDate: true,
				endDate: true,
				client: { select: { id: true, firstName: true, lastName: true } },
			},
		}),
		prisma.forfaitQuote.findMany({
			where: user.role === "ADMIN" ? undefined : { createdById: user.id },
			orderBy: { updatedAt: "desc" },
			take: 200,
			select: {
				id: true,
				name: true,
				clientId: true,
				tripId: true,
				passengers: true,
				currency: true,
				totalSaleCents: true,
				totalRevenueCents: true,
				avgMarginPct: true,
				payload: true,
				constants: true,
				currentRevision: true,
				_count: { select: { revisions: true } },
				updatedAt: true,
			},
		}),
	]);

	const clientOptions = clients.map((c) => ({
		id: c.id,
		name: `${c.firstName} ${c.lastName}`,
	}));

	const tripOptions = trips.map((trip) => ({
		id: trip.id,
		name: trip.name,
		status: trip.status,
		clientId: trip.client.id,
		clientName: `${trip.client.firstName} ${trip.client.lastName}`,
		startDate: trip.startDate ? trip.startDate.toISOString() : null,
		endDate: trip.endDate ? trip.endDate.toISOString() : null,
	}));

	const initialProjects = quotes.map((quote) => ({
		id: quote.id,
		name: quote.name,
		clientId: quote.clientId,
		tripId: quote.tripId,
		passengers: quote.passengers,
		currency: quote.currency,
		totalSaleCents: quote.totalSaleCents,
		totalRevenueCents: quote.totalRevenueCents,
		avgMarginPct: quote.avgMarginPct,
		payload: quote.payload,
		constants: quote.constants,
		currentRevision: quote.currentRevision,
		revisionCount: quote._count.revisions,
		updatedAt: quote.updatedAt.toISOString(),
	}));

	return (
		<ForfaitsWorkbench
			clients={clientOptions}
			trips={tripOptions}
			initialProjects={initialProjects}
		/>
	);
}
