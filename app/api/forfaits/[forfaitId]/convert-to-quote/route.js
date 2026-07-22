import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function toNumber(value) {
	const n = Number.parseFloat(String(value ?? "0"));
	return Number.isFinite(n) ? n : 0;
}

function roundStep(value, step) {
	if (!step || step <= 0) return value;
	return Math.ceil(value / step) * step;
}

function computePricing(draft, constants) {
	const pax = Math.max(1, Math.trunc(toNumber(draft.pax) || 1));
	const perPerson = (key, modeKey) => {
		const raw = toNumber(draft[key]);
		return draft[modeKey] === "tot" ? raw / pax : raw;
	};

	const nuits = Math.max(0, Math.trunc(toNumber(draft.nuits)));
	const hasPre = Boolean(draft.hasPre);
	const hasPost = Boolean(draft.hasPost);
	const hasTransferts = Boolean(draft.hasTransferts);

	const vols = perPerson("vols", "volsMode");
	const bagages = perPerson("bagAller", "bagAllerMode") + perPerson("bagRetour", "bagRetourMode");

	const nuitsHotel = hasPre ? Math.max(0, Math.trunc(toNumber(draft.nuitsHotel))) : 0;
	const nuitsHotelPost = hasPost ? Math.max(0, Math.trunc(toNumber(draft.nuitsHotelPost))) : 0;
	const hotelChambre = toNumber(draft.hotelNuit) * nuitsHotel;
	const hotelChambrePost = toNumber(draft.hotelNuitPost) * nuitsHotelPost;
	const hotelPers = (hotelChambre + hotelChambrePost) / pax;

	const trA = hasTransferts ? perPerson("trA", "trAMode") : 0;
	const trB = hasTransferts ? perPerson("trB", "trBMode") : 0;
	const trC = hasTransferts ? perPerson("trC", "trCMode") : 0;
	const trD = hasTransferts && hasPost ? perPerson("trD", "trDMode") : 0;
	const trE = hasTransferts && hasPost ? perPerson("trE", "trEMode") : 0;
	const transferts = trA + trB + trC + trD + trE;

	const inclus = Boolean(draft.pourboiresInclus);
	const manuel = draft.pourboiresManuel === "" ? null : toNumber(draft.pourboiresManuel);
	const pourboires = inclus ? 0 : manuel !== null ? Math.max(0, manuel) : toNumber(constants.pourboiresNuit) * nuits;

	const usd = Boolean(draft.usdCab);
	const taux = usd ? Math.max(0, toNumber(draft.taux)) : 1;
	const fraisVises = (vols * toNumber(constants.pctVols)) / 100;
	const markupMax = (hotelPers * toNumber(constants.pctMarkup)) / 100;
	const markup = Math.min(fraisVises, markupMax);

	const rows = [];
	const cabineMap = draft.cabins && typeof draft.cabins === "object" ? draft.cabins : {};
	const labels = {
		INT: "Interieure",
		EXT: "Exterieure",
		BAL: "Balcon",
		SUI: "Suite",
	};

	for (const [key, label] of Object.entries(labels)) {
		const brutCabine = toNumber(cabineMap[key]);
		if (!(brutCabine > 0)) continue;
		const facture = usd ? brutCabine * taux : brutCabine;
		const cabinePers = facture / pax;
		const brut = cabinePers + vols + bagages + hotelPers + transferts + pourboires + toNumber(constants.admin) + markup;
		const prixPers = roundStep(brut, toNumber(constants.arrondi));
		const total = prixPers * pax;
		rows.push({ key, label, prixPers, total });
	}

	return { rows, pax };
}

export async function POST(request, { params }) {
	const user = await requireUser();
	const { forfaitId } = await params;

	const source = await prisma.forfaitQuote.findUnique({ where: { id: forfaitId } });
	if (!source) return new NextResponse("Not found", { status: 404 });
	if (user.role !== "ADMIN" && source.createdById !== user.id) return new NextResponse("Forbidden", { status: 403 });
	if (!source.tripId) return NextResponse.json({ error: "Trip is required before conversion." }, { status: 400 });

	const draft = source.payload;
	const constants = source.constants;
	if (!draft || typeof draft !== "object" || !constants || typeof constants !== "object") {
		return NextResponse.json({ error: "Invalid forfait payload." }, { status: 400 });
	}

	const { rows, pax } = computePricing(draft, constants);
	if (rows.length === 0) {
		return NextResponse.json({ error: "No active cabin category to convert." }, { status: 400 });
	}

	const titleBase = typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Forfait";
	const quote = await prisma.quote.create({
		data: {
			tripId: source.tripId,
			title: `${titleBase} - conversion forfait`,
			status: "DRAFT",
			notes: `Genere depuis le forfait ${source.id}. ${pax} passager(s).`,
			lineItems: {
				create: rows.map((row, index) => ({
					description: `Forfait ${row.label} (${pax} pax)`,
					quantity: 1,
					unitPrice: Math.round(row.total * 100),
					sortOrder: index,
				})),
			},
		},
		include: { trip: { select: { id: true, clientId: true } } },
	});

	revalidatePath(`/trips/${quote.trip.id}/quotes`);
	revalidatePath(`/trips/${quote.trip.id}/overview`);

	return NextResponse.json({
		quoteId: quote.id,
		tripId: quote.trip.id,
		redirectTo: `/trips/${quote.trip.id}/quotes`,
	});
}
