import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ForfaitsWorkbench } from "@/components/forfaits/forfaits-workbench";

export const metadata = {
	title: "Packages - AERIA Hub",
};

function quoteIdent(value) {
	return `"${String(value).replace(/"/g, '""')}"`;
}

function normalizeAndSortAirports(rows) {
	const normalized = (Array.isArray(rows) ? rows : [])
		.map((row) => ({
			code: String(row?.code ?? "")
				.toUpperCase()
				.trim(),
			name: String(row?.name ?? "").trim(),
			city: String(row?.city ?? "").trim(),
			country: String(row?.country ?? "")
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

function pickColumn(columnMap, aliases) {
	for (const alias of aliases) {
		const found = columnMap.get(alias.toLowerCase());
		if (found) return found;
	}
	return null;
}

async function loadAirportsFromDb() {
	const tableRows = await prisma.$queryRawUnsafe(`
		SELECT table_schema, table_name, column_name
		FROM information_schema.columns
		WHERE lower(table_name) IN ('airports', 'airport')
		AND table_schema NOT IN ('pg_catalog', 'information_schema')
	`);

	if (!Array.isArray(tableRows) || tableRows.length === 0) {
		return [];
	}

	const grouped = new Map();
	for (const row of tableRows) {
		const schema = String(row.table_schema || "");
		const table = String(row.table_name || "");
		const column = String(row.column_name || "");
		if (!schema || !table || !column) continue;
		const key = `${schema}.${table}`;
		if (!grouped.has(key)) {
			grouped.set(key, { schema, table, columns: new Set() });
		}
		grouped.get(key).columns.add(column);
	}

	const candidates = Array.from(grouped.values());
	if (candidates.length === 0) return [];

	const selected = candidates.find((item) => item.schema === "public") || candidates[0];
	const columnMap = new Map(Array.from(selected.columns).map((column) => [column.toLowerCase(), column]));

	const codeCol = pickColumn(columnMap, ["code", "iata", "iata_code", "airport_code", "code_iata", "iataairport"]);
	const nameCol = pickColumn(columnMap, ["name", "airport", "airport_name", "full_name", "label", "nom", "nom_aeroport"]);
	if (!codeCol || !nameCol) return [];

	const cityCol = pickColumn(columnMap, ["city", "ville", "city_name", "municipality", "commune"]);
	const countryCol = pickColumn(columnMap, ["country", "pays", "country_code", "iso_country", "country_iso"]);

	const selectItems = [
		`${quoteIdent(codeCol)} AS code`,
		`${quoteIdent(nameCol)} AS name`,
		cityCol ? `${quoteIdent(cityCol)} AS city` : `NULL::text AS city`,
		countryCol ? `${quoteIdent(countryCol)} AS country` : `NULL::text AS country`,
	].join(", ");

	const tableRef = `${quoteIdent(selected.schema)}.${quoteIdent(selected.table)}`;
	const rows = await prisma.$queryRawUnsafe(`SELECT ${selectItems} FROM ${tableRef}`);

	return normalizeAndSortAirports(rows);
}

async function loadCruiseCatalogFromDb() {
	const lineRows = await prisma.supplier.findMany({
		where: { category: "CRUISE" },
		orderBy: { name: "asc" },
		select: { id: true, name: true },
	});

	const shipRows = prisma.cruiseShip?.findMany
		? await prisma.cruiseShip.findMany({
				orderBy: { name: "asc" },
				select: {
					id: true,
					name: true,
					supplierId: true,
					supplier: { select: { name: true } },
				},
			})
		: [];

	const portRows = prisma.cruisePort?.findMany
		? await prisma.cruisePort.findMany({
				orderBy: [{ name: "asc" }, { country: "asc" }],
				select: { id: true, name: true, displayText: true, country: true },
			})
		: [];

	const cruiseLineOptions = lineRows.map((line) => ({
		id: line.id,
		value: line.name,
		label: line.name,
	}));

	const cruiseShipOptions = shipRows.map((ship) => ({
		id: ship.id,
		value: ship.name,
		label: ship.name,
		lineId: ship.supplierId || null,
		lineName: ship.supplier?.name || null,
	}));

	const cruisePortOptions = portRows.map((port) => ({
		id: port.id,
		value: port.displayText || port.name,
		label: port.displayText || port.name,
		country: port.country || null,
	}));

	return {
		cruiseLineOptions,
		cruiseShipOptions,
		cruisePortOptions,
	};
}

export default async function ForfaitsPage({ searchParams }) {
	const user = await requireUser();
	const resolvedSearchParams = (await searchParams) || {};
	const initialProjectId = typeof resolvedSearchParams.projectId === "string" ? resolvedSearchParams.projectId : "";
	const initialClientId = typeof resolvedSearchParams.clientId === "string" ? resolvedSearchParams.clientId : "";
	const initialTripId = typeof resolvedSearchParams.tripId === "string" ? resolvedSearchParams.tripId : "";

	const [clients, trips, quotes, airlineSuppliers, iataAirports, cruiseCatalog] = await Promise.all([
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
		loadAirportsFromDb().catch(() => []),
		loadCruiseCatalogFromDb().catch(() => ({
			cruiseLineOptions: [],
			cruiseShipOptions: [],
			cruisePortOptions: [],
		})),
	]);

	const iataAirlines = airlineSuppliers.map((row) => row.name).filter(Boolean);

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
			initialProjectId={initialProjectId}
			initialClientId={initialClientId}
			initialTripId={initialTripId}
			airlineSuppliers={airlineSuppliers}
			iataAirports={iataAirports}
			iataAirlines={iataAirlines}
			cruiseLineOptions={cruiseCatalog.cruiseLineOptions}
			cruiseShipOptions={cruiseCatalog.cruiseShipOptions}
			cruisePortOptions={cruiseCatalog.cruisePortOptions}
		/>
	);
}
