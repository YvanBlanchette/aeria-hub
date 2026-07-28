import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ForfaitsWorkbench } from "@/components/forfaits/forfaits-workbench";
import airportsData from "@/data/airports.json";
import airlinesData from "@/data/airlines.json";

export const metadata = {
	title: "Forfaits - AERIA Hub",
};

function extractIataAirports() {
	const rows = Array.isArray(airportsData?.airports) ? airportsData.airports : [];
	const normalized = rows
		.map((row) => ({
			code: String(row?.code || "")
				.toUpperCase()
				.trim(),
			name: String(row?.name || "").trim(),
			city: String(row?.city || "").trim(),
			country: String(row?.country || "")
				.toUpperCase()
				.trim(),
		}))
		.filter((row) => row.code.length === 3 && row.name);

	const byCode = new Map();
	for (const row of normalized) {
		if (!byCode.has(row.code)) byCode.set(row.code, row);
	}

	const countryRank = (country) => {
		if (country === "CA") return 0;
		if (country === "US") return 1;
		return 2;
	};

	return Array.from(byCode.values()).sort((a, b) => {
		const rankDiff = countryRank(a.country) - countryRank(b.country);
		if (rankDiff !== 0) return rankDiff;
		const cityDiff = a.city.localeCompare(b.city, "fr");
		if (cityDiff !== 0) return cityDiff;
		return a.code.localeCompare(b.code, "fr");
	});
}

function extractIataAirlines() {
	const set = new Set();
	const rows = Array.isArray(airlinesData) ? airlinesData : [];

	for (const row of rows) {
		const names = String(row?.Statistics?.Carriers?.Names || "").split(",");
		for (const name of names) {
			const clean = name.trim();
			if (clean) set.add(clean);
		}
	}

	return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

export default async function ForfaitsPage() {
	const user = await requireUser();
	const iataAirports = extractIataAirports();
	const iataAirlines = extractIataAirlines();

	const [clients, trips, quotes, airlineSuppliers] = await Promise.all([
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
		prisma.supplier.findMany({
			where: { category: "AIRLINE" },
			orderBy: { name: "asc" },
			select: { id: true, name: true },
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
			airlineSuppliers={airlineSuppliers}
			iataAirports={iataAirports}
			iataAirlines={iataAirlines}
		/>
	);
}
