import { prisma } from "@/lib/prisma";

export const DEFAULT_IMPORT_OPTIONS = {
	includeCruise: true,
	includeFlights: true,
	includeHotels: true,
	includeTransfers: true,
	importIntoExistingTrip: false,
};

function text(value) {
	return typeof value === "string" ? value.trim() : "";
}

export function toNumber(value) {
	const n = Number.parseFloat(String(value ?? "0"));
	return Number.isFinite(n) ? n : 0;
}

export function parseOptionalDate(value) {
	const trimmed = text(value);
	if (!trimmed) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
	const date = new Date(`${trimmed}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalDateTime(dateValue, timeValue) {
	const dateText = text(dateValue);
	if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
	const timeText = text(timeValue);
	const normalizedTime = /^\d{2}:\d{2}$/.test(timeText) ? `${timeText}:00` : "00:00:00";
	const date = new Date(`${dateText}T${normalizedTime}.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function centsFromAmount(amount) {
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return Math.round(amount * 100);
}

export function normalizeImportOptions(value) {
	const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
	return {
		includeCruise: source.includeCruise !== false,
		includeFlights: source.includeFlights !== false,
		includeHotels: source.includeHotels !== false,
		includeTransfers: source.includeTransfers !== false,
		importIntoExistingTrip: source.importIntoExistingTrip === true,
	};
}

export function buildTripDraft(source, draft) {
	const cleanName = text(source?.name) || "Forfait";
	const name = text(draft?.projectName) || cleanName;
	const destinationParts = [draft?.compagnie, draft?.navire, draft?.portDepart].map((value) => text(value)).filter(Boolean);
	const destination = destinationParts.join(" - ") || "Croisiere";

	return {
		name,
		destination,
		startDate: parseOptionalDate(draft?.croisiereDebut),
		endDate: parseOptionalDate(draft?.croisiereFin),
		status: "INQUIRY",
		totalPrice: Number.isFinite(source?.totalSaleCents) ? source.totalSaleCents : null,
		finalPaymentDate: parseOptionalDate(draft?.soldeDate),
	};
}

function buildCruiseSegment(draft) {
	const titleParts = [text(draft?.compagnie), text(draft?.navire)].filter(Boolean);
	if (titleParts.length === 0 && !text(draft?.portDepart) && !text(draft?.portArrivee)) return null;

	const locationParts = [text(draft?.portDepart), text(draft?.portArrivee)].filter(Boolean);
	const cruisePortStops = Array.isArray(draft?.cruisePortStops) ? draft.cruisePortStops : [];
	const stops = cruisePortStops.map((stop) => text(stop?.label || stop?.value || stop?.id)).filter(Boolean);

	return {
		type: "CRUISE",
		title: titleParts.join(" - ") || "Croisiere",
		location: locationParts.length === 2 ? `${locationParts[0]} -> ${locationParts[1]}` : locationParts[0] || null,
		startDateTime: parseOptionalDateTime(draft?.croisiereDebut, "00:00"),
		endDateTime: parseOptionalDateTime(draft?.croisiereFin, "00:00"),
		notes: text(draft?.croisiereNotes) || null,
		details: {
			line: text(draft?.compagnie) || null,
			ship: text(draft?.navire) || null,
			portDepart: text(draft?.portDepart) || null,
			portArrivee: text(draft?.portArrivee) || null,
			stops,
		},
	};
}

function buildFlightSegments(draft, direction = "aller") {
	const key = direction === "retour" ? "volsRetourSegments" : "volsAllerSegments";
	const list = Array.isArray(draft?.[key]) ? draft[key] : [];
	return list
		.map((segment, index) => {
			const from = text(segment?.fromIata).toUpperCase();
			const to = text(segment?.toIata).toUpperCase();
			const startDateTime = parseOptionalDateTime(segment?.departDate, segment?.departTime);
			const endDateTime = parseOptionalDateTime(segment?.arriveDate, segment?.arriveTime);
			if (!from && !to && !startDateTime && !endDateTime) return null;
			const flightLabel = direction === "retour" ? "Vol retour" : "Vol aller";
			return {
				type: "FLIGHT",
				title: `${flightLabel} ${index + 1}`,
				location: from && to ? `${from} -> ${to}` : from || to || null,
				startDateTime,
				endDateTime,
				notes: null,
				details: {
					direction,
					segmentNumber: index + 1,
					airline: text(segment?.airline) || null,
					operator: text(segment?.operator) || null,
					fromIata: from || null,
					toIata: to || null,
				},
			};
		})
		.filter(Boolean);
}

function buildHotelSegment(draft, stayType = "pre") {
	const isPost = stayType === "post";
	const hasStay = isPost ? Boolean(draft?.hasPost) : Boolean(draft?.hasPre);
	if (!hasStay) return null;

	const hotelName = text(isPost ? draft?.hotelPostNom : draft?.hotelNom);
	const checkin = parseOptionalDateTime(isPost ? draft?.hotelPostDebut : draft?.hotelDebut, "15:00");
	const checkout = parseOptionalDateTime(isPost ? draft?.hotelPostFin : draft?.hotelFin, "11:00");
	const nights = Math.max(0, Math.trunc(toNumber(isPost ? draft?.nuitsHotelPost : draft?.nuitsHotel)));
	const nightly = toNumber(isPost ? draft?.hotelNuitPost : draft?.hotelNuit);
	if (!hotelName && !checkin && !checkout && nights === 0 && nightly <= 0) return null;

	return {
		type: "HOTEL",
		title: isPost ? "Hotel post-croisiere" : "Hotel pre-croisiere",
		location: hotelName || null,
		startDateTime: checkin,
		endDateTime: checkout,
		notes: null,
		cost: centsFromAmount(nightly * nights),
		details: {
			phase: stayType,
			hotelName: hotelName || null,
			nights,
			nightlyRate: nightly > 0 ? nightly : null,
		},
	};
}

function buildTransferSegments(draft) {
	if (!draft?.hasTransferts) return [];
	const pax = Math.max(1, Math.trunc(toNumber(draft?.pax) || 1));
	const definitions = [
		{ key: "trA", mode: "trAMode", notes: "trAComp", title: "Transfert aeroport -> hotel", location: "Aeroport -> Hotel" },
		{ key: "trB", mode: "trBMode", notes: "trBComp", title: "Transfert hotel -> port", location: "Hotel -> Port" },
		{ key: "trC", mode: "trCMode", notes: "trCComp", title: "Transfert port -> aeroport", location: "Port -> Aeroport" },
		{ key: "trD", mode: "trDMode", notes: "trDComp", title: "Transfert port -> hotel post", location: "Port -> Hotel post", postOnly: true },
		{ key: "trE", mode: "trEMode", notes: "trEComp", title: "Transfert hotel post -> aeroport", location: "Hotel post -> Aeroport", postOnly: true },
	];

	return definitions
		.map((item) => {
			if (item.postOnly && !draft?.hasPost) return null;
			const amount = toNumber(draft?.[item.key]);
			const mode = text(draft?.[item.mode]) === "tot" ? "tot" : "pers";
			const total = mode === "tot" ? amount : amount * pax;
			const note = text(draft?.[item.notes]);
			if (!(total > 0) && !note) return null;
			return {
				type: "TRANSFER",
				title: item.title,
				location: item.location,
				notes: note || null,
				cost: centsFromAmount(total),
				details: {
					mode,
					amount,
					passengers: pax,
				},
			};
		})
		.filter(Boolean);
}

export function buildTripSegmentsDraft(draft, importOptions = DEFAULT_IMPORT_OPTIONS) {
	const options = normalizeImportOptions(importOptions);
	const segments = [];
	if (options.includeCruise) {
		const cruise = buildCruiseSegment(draft);
		if (cruise) segments.push(cruise);
	}
	if (options.includeFlights) {
		segments.push(...buildFlightSegments(draft, "aller"));
		segments.push(...buildFlightSegments(draft, "retour"));
	}
	if (options.includeHotels) {
		const preHotel = buildHotelSegment(draft, "pre");
		if (preHotel) segments.push(preHotel);
		const postHotel = buildHotelSegment(draft, "post");
		if (postHotel) segments.push(postHotel);
	}
	if (options.includeTransfers) {
		segments.push(...buildTransferSegments(draft));
	}
	return segments.map((segment, index) => ({ ...segment, sortOrder: index }));
}

function segmentFingerprint(segment) {
	const start = segment.startDateTime instanceof Date ? segment.startDateTime.toISOString() : String(segment.startDateTime || "");
	const end = segment.endDateTime instanceof Date ? segment.endDateTime.toISOString() : String(segment.endDateTime || "");
	return [segment.type, segment.title || "", segment.location || "", start, end].join("|").toLowerCase();
}

async function buildSegmentImportPlan(tripId, draft, importOptions) {
	const candidates = buildTripSegmentsDraft(draft, importOptions);
	if (candidates.length === 0) {
		return {
			candidates,
			toCreateSegments: [],
			toCreate: [],
			skipped: [],
		};
	}

	const existing = await prisma.tripSegment.findMany({
		where: { tripId },
		select: { type: true, title: true, location: true, startDateTime: true, endDateTime: true, sortOrder: true },
		orderBy: [{ sortOrder: "desc" }],
	});

	const existingFingerprints = new Set(existing.map((segment) => segmentFingerprint(segment)));
	let nextSortOrder = existing.length > 0 ? Math.max(...existing.map((segment) => segment.sortOrder || 0)) + 1 : 0;

	const toCreateCandidates = candidates.filter((segment) => !existingFingerprints.has(segmentFingerprint(segment)));
	const skipped = candidates.filter((segment) => existingFingerprints.has(segmentFingerprint(segment)));

	const toCreate = toCreateCandidates.map((segment) => ({
		tripId,
		type: segment.type,
		title: segment.title,
		location: segment.location || null,
		startDateTime: segment.startDateTime || null,
		endDateTime: segment.endDateTime || null,
		notes: segment.notes || null,
		cost: segment.cost || null,
		details: segment.details || undefined,
		sortOrder: nextSortOrder++,
	}));

	return {
		candidates,
		toCreateSegments: toCreateCandidates,
		toCreate,
		skipped,
	};
}

async function appendMissingSegments(tripId, draft, importOptions) {
	const plan = await buildSegmentImportPlan(tripId, draft, importOptions);
	const { toCreate, skipped } = plan;

	if (toCreate.length > 0) {
		await prisma.tripSegment.createMany({ data: toCreate });
	}

	return { importedCount: toCreate.length, skippedCount: skipped.length };
}

export async function previewTripSegmentPlan(source, draft, importOptions) {
	const options = normalizeImportOptions(importOptions);

	if (source.tripId) {
		const existingTrip = await prisma.trip.findUnique({ where: { id: source.tripId }, select: { id: true } });
		if (existingTrip) {
			const plan = await buildSegmentImportPlan(source.tripId, draft, options);
			return {
				tripId: source.tripId,
				tripExists: true,
				tripWillBeCreated: false,
				importIntoExistingTrip: options.importIntoExistingTrip,
				candidates: plan.candidates,
				toCreate: options.importIntoExistingTrip ? plan.toCreate : [],
				toCreateSegments: options.importIntoExistingTrip ? plan.toCreateSegments : [],
				skipped: options.importIntoExistingTrip ? plan.skipped : plan.candidates,
			};
		}
	}

	const candidates = buildTripSegmentsDraft(draft, options);
	return {
		tripId: null,
		tripExists: false,
		tripWillBeCreated: true,
		importIntoExistingTrip: options.importIntoExistingTrip,
		candidates,
		toCreate: candidates,
		toCreateSegments: candidates,
		skipped: [],
	};
}

export async function ensureTripLinked(source, draft, importOptions) {
	const options = normalizeImportOptions(importOptions);
	if (source.tripId) {
		const existingTrip = await prisma.trip.findUnique({ where: { id: source.tripId }, select: { id: true } });
		if (existingTrip) {
			if (!options.importIntoExistingTrip) {
				return { tripId: source.tripId, created: false, importedCount: 0, skippedCount: 0 };
			}

			const sync = await appendMissingSegments(source.tripId, draft, options);
			return { tripId: source.tripId, created: false, importedCount: sync.importedCount, skippedCount: sync.skippedCount };
		}
	}

	if (!source.clientId) {
		return { error: "Client is required to convert a forfait into a trip.", status: 400 };
	}

	const segments = buildTripSegmentsDraft(draft, options);
	const trip = await prisma.trip.create({
		data: {
			clientId: source.clientId,
			...buildTripDraft(source, draft),
			segments: {
				create: segments,
			},
		},
	});

	await prisma.forfaitQuote.update({ where: { id: source.id }, data: { tripId: trip.id } });
	return { tripId: trip.id, created: true, importedCount: segments.length, skippedCount: 0 };
}
