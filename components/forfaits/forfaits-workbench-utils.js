export const CONSTANTS_KEY = "aeria.forfaits.constants.v1";

export const DEFAULT_CONSTANTS = {
	admin: 150,
	pctVols: 10,
	pctMarkup: 30,
	pourboiresNuit: 25,
	arrondi: 0,
};

export const TAB_ITEMS = [{ id: "croisiere" }, { id: "vols" }, { id: "hotel" }, { id: "sommaire" }, { id: "projets" }, { id: "parametres" }];

export const CABINS = [
	{ id: "INT", label: "Interieure" },
	{ id: "EXT", label: "Exterieure" },
	{ id: "BAL", label: "Balcon" },
	{ id: "SUI", label: "Suite" },
];

export const NOTICE_TIMEOUT_MS = 4500;

const CRUISE_LINE_SHIP_TERMS = {
	AmaWaterways: ["ama"],
	Azamara: ["azamara"],
	"Carnival Cruise Line": ["carnival"],
	"Celebrity Cruises": ["celebrity", "flora", "xcel"],
	"Celebrity River": ["celebrity"],
	"Celestyal Cruises": ["celestyal"],
	"Costa Cruise Lines": ["costa"],
	Cunard: ["queen anne", "queen elizabeth", "queen mary", "queen victoria"],
	"Disney Cruise Line": ["disney"],
	"Holland America Line": ["eurodam", "koningsdam", "nieuw", "noordam", "oosterdam", "rotterdam", "volendam", "westerdam", "zaandam", "zuiderdam"],
	"HX Expeditions": ["fram", "fridtjof", "maud", "otto sverdrup", "roald amundsen", "spitsbergen", "trollfjord"],
	"MSC Cruises": ["msc"],
	"Norwegian Cruise Line": ["norwegian", "pride of america"],
	"Princess Cruises": ["princess"],
	"Royal Caribbean International": ["of the seas"],
	"Seabourn Cruise Line": ["seabourn"],
	"Silversea Cruises": ["silver"],
	"Virgin Voyages": ["lady"],
	"Avalon Waterways River Cruises": ["avalon"],
};

export function tr(locale, fr, en) {
	return locale === "en" ? en : fr;
}

export function matchesCruiseLineShip(shipLabel, cruiseLineLabel) {
	if (!cruiseLineLabel) return true;
	const terms = CRUISE_LINE_SHIP_TERMS[cruiseLineLabel] || [];
	if (terms.length === 0) return false;
	const normalizedShip = String(shipLabel || "").toLowerCase();
	return terms.some((term) => normalizedShip.includes(term));
}

export function createFlightSegment(direction = "aller") {
	return {
		airline: "",
		operator: "",
		fromIata: direction === "aller" ? "YUL" : "",
		departDate: "",
		departTime: "",
		arriveDate: "",
		arriveTime: "",
		toIata: "",
	};
}

export function normalizeFlightSegments(value, direction = "aller") {
	const list = Array.isArray(value) ? value : [];
	if (list.length === 0) return [createFlightSegment(direction)];
	return list.map((item) => ({ ...createFlightSegment(direction), ...(item || {}) }));
}

export function normalizeIata(value) {
	return String(value || "")
		.toUpperCase()
		.replace(/[^A-Z]/g, "")
		.slice(0, 3);
}

function parseDateString(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
	const [year, month, day] = String(value)
		.split("-")
		.map((part) => Number.parseInt(part, 10));
	if (![year, month, day].every(Number.isFinite)) return null;
	return Date.UTC(year, month - 1, day);
}

function formatDateString(timestamp) {
	if (!Number.isFinite(timestamp)) return "";
	const date = new Date(timestamp);
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(dateValue, days) {
	const timestamp = parseDateString(dateValue);
	const dayCount = Number.parseInt(String(days), 10);
	if (!Number.isFinite(timestamp) || !Number.isFinite(dayCount)) return "";
	return formatDateString(timestamp + dayCount * 24 * 60 * 60 * 1000);
}

export function diffDays(startValue, endValue) {
	const start = parseDateString(startValue);
	const end = parseDateString(endValue);
	if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
	return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

function normalizePortSearchText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function matchCruisePortOption(text, options) {
	const normalizedText = normalizePortSearchText(text);
	if (!normalizedText) return null;
	const list = Array.isArray(options) ? options : [];
	return (
		list.find((option) => normalizePortSearchText(option.label) === normalizedText) ||
		list.find((option) => normalizePortSearchText(option.label).includes(normalizedText)) ||
		list.find((option) => normalizedText.includes(normalizePortSearchText(option.label))) ||
		null
	);
}

export function normalizeCruisePortItems(value, options) {
	const list = Array.isArray(value) ? value : [];
	return list
		.map((item) => {
			if (!item) return null;
			if (typeof item === "string") {
				const option = matchCruisePortOption(item, options);
				return option || { id: item, value: item, label: item };
			}
			const option = matchCruisePortOption(item.label || item.value || item.id, options);
			return {
				id: String(item.id || option?.id || item.value || item.label || ""),
				value: String(item.value || option?.value || item.label || item.id || ""),
				label: String(item.label || option?.label || item.value || item.id || ""),
			};
		})
		.filter((item) => item && item.value && item.label);
}

export function parseCruisePortPaste(text, options) {
	const rawParts = String(text || "")
		.replace(/^ports\s+of\s+call\s*/i, "")
		.split(/\s*\|\s*|\r?\n+/)
		.map((part) => part.trim())
		.filter(Boolean);

	return rawParts
		.map((part, index) => {
			const cleaned = index === 0 ? part.replace(/^ports\s+of\s+call\s*/i, "").trim() : part;
			const option = matchCruisePortOption(cleaned, options);
			return option || { id: cleaned, value: cleaned, label: cleaned };
		})
		.filter((item) => item && item.value && item.label);
}

export function makeDefaultDraft() {
	return {
		projectName: "",
		clientId: "",
		tripId: "",
		compagnie: "",
		navire: "",
		portDepart: "",
		portArrivee: "",
		cruisePortStops: [],
		croisiereDebut: "",
		croisiereFin: "",
		croisiereNotes: "",
		pax: 2,
		nuits: 7,
		pourboiresInclus: false,
		pourboiresManuel: "",
		usdCab: false,
		taux: 1.38,
		hasPre: true,
		hasPost: false,
		hasTransferts: true,
		nuitsHotel: 1,
		nuitsHotelPost: 1,
		hotelNuit: "",
		hotelNuitPost: "",
		hotelNom: "",
		hotelPostNom: "",
		hotelDebut: "",
		hotelFin: "",
		hotelPostDebut: "",
		hotelPostFin: "",
		volsDetails: "",
		volsAllerSegments: [createFlightSegment("aller")],
		volsRetourSegments: [createFlightSegment("retour")],
		vols: "",
		volsMode: "pers",
		bagAller: "",
		bagAllerMode: "pers",
		bagRetour: "",
		bagRetourMode: "pers",
		trA: "",
		trAMode: "pers",
		trB: "",
		trBMode: "pers",
		trC: "",
		trCMode: "pers",
		trD: "",
		trDMode: "pers",
		trE: "",
		trEMode: "pers",
		trAComp: "",
		trBComp: "",
		trCComp: "",
		trDComp: "",
		trEComp: "",
		commissionHotelPre: "",
		commissionHotelPost: "",
		commissionTransferts: "",
		commissionVols: "",
		cabExampleInt: "",
		cabExampleExt: "",
		cabExampleBal: "",
		cabExampleSui: "",
		depot: "",
		depotDate: "",
		soldeDate: "",
		notes: "",
		cabins: {
			INT: "",
			EXT: "",
			BAL: "",
			SUI: "",
		},
		commissions: {
			INT: "",
			EXT: "",
			BAL: "",
			SUI: "",
		},
		inclusions: {
			boissons: false,
			wifi: false,
			restos: false,
			creditBord: false,
			creditExcursions: false,
			pourboires: false,
			fraisAdminCredites: false,
			dejeuner: false,
			toutInclus: false,
			navette: false,
			balcon: false,
			vue: false,
			bagages: false,
			sieges: false,
			transfertAeroHotel: false,
			transfertHotelPort: false,
			transfertPortAero: false,
			transfertPortHotelPost: false,
			transfertHotelPostAero: false,
		},
	};
}

export function toNumber(value) {
	if (value === "" || value === null || typeof value === "undefined") return 0;
	const n = Number.parseFloat(String(value));
	return Number.isFinite(n) ? n : 0;
}

function roundStep(value, step) {
	if (!step || step <= 0) return value;
	return Math.ceil(value / step) * step;
}

export function fmtCad(value) {
	return new Intl.NumberFormat("fr-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: 2,
	}).format(Number.isFinite(value) ? value : 0);
}

export function computeBase(draft, constants) {
	const pax = Math.max(1, Math.trunc(toNumber(draft.pax)) || 1);

	const valuePerPerson = (key, modeKey) => {
		const raw = toNumber(draft[key]);
		const mode = draft[modeKey] === "tot" ? "tot" : "pers";
		return mode === "tot" ? raw / pax : raw;
	};

	const nuits = Math.max(0, Math.trunc(toNumber(draft.nuits)));
	const hasPre = Boolean(draft.hasPre);
	const hasPost = Boolean(draft.hasPost);
	const hasTransferts = Boolean(draft.hasTransferts);
	const nuitsHotel = hasPre ? Math.max(0, Math.trunc(toNumber(draft.nuitsHotel))) : 0;
	const nuitsHotelPost = hasPost ? Math.max(0, Math.trunc(toNumber(draft.nuitsHotelPost))) : 0;

	const vols = valuePerPerson("vols", "volsMode");
	const bagAller = valuePerPerson("bagAller", "bagAllerMode");
	const bagRetour = valuePerPerson("bagRetour", "bagRetourMode");
	const bagages = bagAller + bagRetour;

	const hotelNuit = hasPre ? toNumber(draft.hotelNuit) : 0;
	const hotelNuitPost = hasPost ? toNumber(draft.hotelNuitPost) : 0;
	const hotelChambre = hotelNuit * nuitsHotel;
	const hotelChambrePost = hotelNuitPost * nuitsHotelPost;
	const hotelTotal = hotelChambre + hotelChambrePost;
	const hotelPers = pax > 0 ? hotelTotal / pax : 0;

	const trA = hasTransferts ? valuePerPerson("trA", "trAMode") : 0;
	const trB = hasTransferts ? valuePerPerson("trB", "trBMode") : 0;
	const trC = hasTransferts ? valuePerPerson("trC", "trCMode") : 0;
	const trD = hasTransferts && hasPost ? valuePerPerson("trD", "trDMode") : 0;
	const trE = hasTransferts && hasPost ? valuePerPerson("trE", "trEMode") : 0;
	const transferts = trA + trB + trC + trD + trE;
	const nbTransferts = hasTransferts ? (hasPost ? 5 : 3) : 0;

	const inclus = Boolean(draft.pourboiresInclus);
	const manuel = draft.pourboiresManuel === "" ? null : toNumber(draft.pourboiresManuel);
	let pourboires = 0;
	let pourboiresMode = "inclus";
	if (inclus) {
		pourboires = 0;
		pourboiresMode = "inclus";
	} else if (manuel !== null && Number.isFinite(manuel)) {
		pourboires = Math.max(0, manuel);
		pourboiresMode = "manuel";
	} else {
		pourboires = constants.pourboiresNuit * nuits;
		pourboiresMode = "auto";
	}

	const totalNuits = nuits + nuitsHotel + nuitsHotelPost;
	const usd = Boolean(draft.usdCab);
	const taux = usd ? Math.max(0, toNumber(draft.taux)) : 1;

	const fraisVises = (vols * constants.pctVols) / 100;
	const markupMax = (hotelPers * constants.pctMarkup) / 100;
	const markup = Math.min(fraisVises, markupMax);
	const perte = Math.max(0, fraisVises - markup);
	const markupTotal = markup * pax;
	const partPre = hotelTotal > 0 ? hotelChambre / hotelTotal : 1;

	return {
		pax,
		nuits,
		hasPre,
		hasPost,
		hasTransferts,
		nuitsHotel,
		nuitsHotelPost,
		vols,
		bagAller,
		bagRetour,
		bagages,
		hotelNuit,
		hotelNuitPost,
		hotelChambre,
		hotelChambrePost,
		hotelPers,
		hotelTotal,
		trA,
		trB,
		trC,
		trD,
		trE,
		transferts,
		nbTransferts,
		pourboires,
		pourboiresMode,
		totalNuits,
		usd,
		taux,
		fraisVises,
		markupMax,
		markup,
		perte,
		hotelClientChambre: hotelChambre + markupTotal * partPre,
		hotelClientChambrePost: hotelChambrePost + markupTotal * (1 - partPre),
	};
}

export function activeCabins(draft, base) {
	return CABINS.map((cab) => {
		const raw = toNumber(draft.cabins[cab.id]);
		if (!(raw > 0)) return null;
		const facture = base.usd ? raw * base.taux : raw;
		return {
			id: cab.id,
			label: cab.label,
			factureBrute: raw,
			facture,
		};
	}).filter(Boolean);
}

export function cabinCalc(base, constants, cabineFacture) {
	const cabinePers = cabineFacture / base.pax;
	const brut = cabinePers + base.vols + base.bagages + base.hotelPers + base.transferts + base.pourboires + constants.admin + base.markup;
	const prixPers = roundStep(brut, constants.arrondi);
	const coussin = prixPers - brut;
	const total = prixPers * base.pax;
	const prixPersNuit = base.totalNuits > 0 ? prixPers / base.totalNuits : 0;
	return { cabinePers, brut, prixPers, coussin, total, prixPersNuit };
}

export function flattenDraftToCsvRows(draft) {
	const rows = [];
	const walk = (prefix, value) => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			Object.entries(value).forEach(([k, v]) => walk(prefix ? `${prefix}.${k}` : k, v));
			return;
		}
		rows.push([prefix, String(value ?? "")]);
	};
	walk("", draft);
	return rows.filter(([k]) => k !== "");
}

export function asCsvCell(value) {
	const s = String(value);
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parseCsvRows(text) {
	const rows = [];
	let field = "";
	let row = [];
	let inQuotes = false;
	const src = text.replace(/^\ufeff/, "");
	for (let i = 0; i < src.length; i += 1) {
		const ch = src[i];
		if (inQuotes) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					field += '"';
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ",") {
			row.push(field);
			field = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && src[i + 1] === "\n") i += 1;
			row.push(field);
			field = "";
			if (row.length > 1 || row[0] !== "") rows.push(row);
			row = [];
		} else {
			field += ch;
		}
	}
	if (field !== "" || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

export function setByPath(target, path, rawValue) {
	const keys = path.split(".");
	let node = target;
	for (let i = 0; i < keys.length - 1; i += 1) {
		const key = keys[i];
		if (!node[key] || typeof node[key] !== "object") node[key] = {};
		node = node[key];
	}
	const last = keys[keys.length - 1];
	if (rawValue === "true") {
		node[last] = true;
	} else if (rawValue === "false") {
		node[last] = false;
	} else if (rawValue !== "" && !Number.isNaN(Number(rawValue)) && String(Number(rawValue)) === rawValue.trim()) {
		node[last] = Number(rawValue);
	} else {
		node[last] = rawValue;
	}
}

function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeConstantsInput(value) {
	if (!isRecord(value)) return { ...DEFAULT_CONSTANTS };
	return {
		admin: Math.max(0, toNumber(value.admin ?? DEFAULT_CONSTANTS.admin)),
		pctVols: Math.max(0, toNumber(value.pctVols ?? DEFAULT_CONSTANTS.pctVols)),
		pctMarkup: Math.max(0, toNumber(value.pctMarkup ?? DEFAULT_CONSTANTS.pctMarkup)),
		pourboiresNuit: Math.max(0, toNumber(value.pourboiresNuit ?? DEFAULT_CONSTANTS.pourboiresNuit)),
		arrondi: Math.max(0, toNumber(value.arrondi ?? DEFAULT_CONSTANTS.arrondi)),
	};
}

export function normalizeDraftInput(value, portOptions = []) {
	const source = isRecord(value) ? value : {};
	const defaults = makeDefaultDraft();
	const merged = {
		...defaults,
		...source,
		cabins: {
			...defaults.cabins,
			...(isRecord(source.cabins) ? source.cabins : {}),
		},
		commissions: {
			...defaults.commissions,
			...(isRecord(source.commissions) ? source.commissions : {}),
		},
		inclusions: {
			...defaults.inclusions,
			...(isRecord(source.inclusions) ? source.inclusions : {}),
		},
	};

	merged.hasPre = Boolean(merged.hasPre);
	merged.hasPost = Boolean(merged.hasPost);
	merged.hasTransferts = Boolean(merged.hasTransferts);
	merged.pourboiresInclus = Boolean(merged.pourboiresInclus);
	merged.usdCab = Boolean(merged.usdCab);
	merged.volsAllerSegments = normalizeFlightSegments(source.volsAllerSegments, "aller");
	merged.volsRetourSegments = normalizeFlightSegments(source.volsRetourSegments, "retour");
	merged.cruisePortStops = normalizeCruisePortItems(source.cruisePortStops, portOptions);

	return merged;
}

export async function readResponseJson(response) {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

export function getResponseErrorMessage(payload, fallbackMessage) {
	const msg = typeof payload?.error === "string" && payload.error.trim() ? payload.error.trim() : "";
	return msg || fallbackMessage;
}
