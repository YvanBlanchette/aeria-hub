"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Check, ChevronDown, Copy, Download, FileText, FolderOpen, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const CONSTANTS_KEY = "aeria.forfaits.constants.v1";

const DEFAULT_CONSTANTS = {
	admin: 150,
	pctVols: 10,
	pctMarkup: 30,
	pourboiresNuit: 25,
	arrondi: 0,
};

const TAB_ITEMS = [{ id: "croisiere" }, { id: "vols" }, { id: "hotel" }, { id: "sommaire" }, { id: "parametres" }];

const CABINS = [
	{ id: "INT", label: "Interieure" },
	{ id: "EXT", label: "Exterieure" },
	{ id: "BAL", label: "Balcon" },
	{ id: "SUI", label: "Suite" },
];

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

function tr(locale, fr, en) {
	return locale === "en" ? en : fr;
}

function matchesCruiseLineShip(shipLabel, cruiseLineLabel) {
	if (!cruiseLineLabel) return true;
	const terms = CRUISE_LINE_SHIP_TERMS[cruiseLineLabel] || [];
	if (terms.length === 0) return false;
	const normalizedShip = String(shipLabel || "").toLowerCase();
	return terms.some((term) => normalizedShip.includes(term));
}

function createFlightSegment() {
	return {
		airline: "",
		operator: "",
		fromIata: "",
		departTime: "",
		arriveTime: "",
		toIata: "",
	};
}

function normalizeFlightSegments(value) {
	const list = Array.isArray(value) ? value : [];
	if (list.length === 0) return [createFlightSegment()];
	return list.map((item) => ({ ...createFlightSegment(), ...(item || {}) }));
}

function normalizeIata(value) {
	return String(value || "")
		.toUpperCase()
		.replace(/[^A-Z]/g, "")
		.slice(0, 3);
}

function parseTimeToMinutes(value) {
	if (!/^\d{2}:\d{2}$/.test(String(value || ""))) return null;
	const [h, m] = value.split(":").map((part) => Number.parseInt(part, 10));
	if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
	if (h < 0 || h > 23 || m < 0 || m > 59) return null;
	return h * 60 + m;
}

function minutesDiff(start, end) {
	const startMin = parseTimeToMinutes(start);
	const endMin = parseTimeToMinutes(end);
	if (startMin === null || endMin === null) return null;
	const raw = endMin - startMin;
	return raw >= 0 ? raw : raw + 24 * 60;
}

function formatDuration(minutes) {
	if (!Number.isFinite(minutes) || minutes < 0) return "-";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h <= 0) return `${m} min`;
	if (m === 0) return `${h} h`;
	return `${h} h ${m} min`;
}

function makeDefaultDraft() {
	return {
		projectName: "",
		clientId: "",
		tripId: "",
		compagnie: "",
		navire: "",
		portDepart: "",
		portArrivee: "",
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
		volsAllerSegments: [createFlightSegment()],
		volsRetourSegments: [createFlightSegment()],
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

function toNumber(value) {
	if (value === "" || value === null || typeof value === "undefined") return 0;
	const n = Number.parseFloat(String(value));
	return Number.isFinite(n) ? n : 0;
}

function roundStep(value, step) {
	if (!step || step <= 0) return value;
	return Math.ceil(value / step) * step;
}

function fmtCad(value) {
	return new Intl.NumberFormat("fr-CA", {
		style: "currency",
		currency: "CAD",
		maximumFractionDigits: 2,
	}).format(Number.isFinite(value) ? value : 0);
}

function computeBase(draft, constants) {
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

function activeCabins(draft, base) {
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

function cabinCalc(base, constants, cabineFacture) {
	const cabinePers = cabineFacture / base.pax;
	const brut = cabinePers + base.vols + base.bagages + base.hotelPers + base.transferts + base.pourboires + constants.admin + base.markup;
	const prixPers = roundStep(brut, constants.arrondi);
	const coussin = prixPers - brut;
	const total = prixPers * base.pax;
	const prixPersNuit = base.totalNuits > 0 ? prixPers / base.totalNuits : 0;
	return { cabinePers, brut, prixPers, coussin, total, prixPersNuit };
}

function flattenDraftToCsvRows(draft) {
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

function asCsvCell(value) {
	const s = String(value);
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsvRows(text) {
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

function setByPath(target, path, rawValue) {
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

export function ForfaitsWorkbench({
	clients,
	trips,
	initialProjects,
	airlineSuppliers = [],
	iataAirports = [],
	iataAirlines = [],
	cruiseLineOptions = [],
	cruiseShipOptions = [],
	cruisePortOptions = [],
}) {
	const { locale } = useLocale();
	const yesNoOptions = useMemo(
		() => [
			{ value: "false", label: tr(locale, "Non", "No") },
			{ value: "true", label: tr(locale, "Oui", "Yes") },
		],
		[locale],
	);
	const [hotelPre, setHotelPre] = useState(() => makeDefaultDraft().hasPre);
	const [hotelPost, setHotelPost] = useState(() => makeDefaultDraft().hasPost);
	const [tab, setTab] = useState("croisiere");
	const [draft, setDraft] = useState(() => makeDefaultDraft());
	const [constants, setConstants] = useState(() => {
		if (typeof window === "undefined") return DEFAULT_CONSTANTS;
		try {
			const savedConstants = window.localStorage.getItem(CONSTANTS_KEY);
			if (!savedConstants) return DEFAULT_CONSTANTS;
			const parsed = JSON.parse(savedConstants);
			return { ...DEFAULT_CONSTANTS, ...parsed };
		} catch {
			return DEFAULT_CONSTANTS;
		}
	});
	const [projects, setProjects] = useState(() =>
		Array.isArray(initialProjects)
			? initialProjects.map((project) => ({
					...project,
					draft: project.payload || makeDefaultDraft(),
				}))
			: [],
	);
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [notice, setNotice] = useState("");
	const [busy, setBusy] = useState(false);
	const [revisions, setRevisions] = useState([]);
	const [loadingRevisions, setLoadingRevisions] = useState(false);
	const importJsonRef = useRef(null);
	const importCsvRef = useRef(null);

	useEffect(() => {
		try {
			localStorage.setItem(CONSTANTS_KEY, JSON.stringify(constants));
		} catch {
			console.warn("Impossible de sauvegarder les constantes localement.");
		}
	}, [constants]);

	const base = useMemo(() => computeBase(draft, constants), [draft, constants]);
	const cabinRows = useMemo(() => activeCabins(draft, base), [draft, base]);
	const { admin } = constants;

	const resultRows = useMemo(() => {
		return cabinRows.map((cab) => {
			const calc = cabinCalc(base, constants, cab.facture);
			const commCroisiere = toNumber(draft.commissions[cab.id]);
			const commHotel = toNumber(draft.commissionHotelPre) + toNumber(draft.commissionHotelPost);
			const commTransferts = toNumber(draft.commissionTransferts);
			const commVols = toNumber(draft.commissionVols);
			const markupRev = base.markup * base.pax;
			const adminRev = admin * base.pax;
			const coussinRev = calc.coussin * base.pax;
			const revenu = commCroisiere + commHotel + commTransferts + commVols + markupRev + adminRev + coussinRev;
			const margePct = calc.total > 0 ? (revenu / calc.total) * 100 : 0;

			return {
				...cab,
				calc,
				revenu,
				margePct,
				commCroisiere,
			};
		});
	}, [
		admin,
		base,
		cabinRows,
		constants,
		draft.commissionHotelPost,
		draft.commissionHotelPre,
		draft.commissionTransferts,
		draft.commissionVols,
		draft.commissions,
	]);

	const summary = useMemo(() => {
		const totalVente = resultRows.reduce((sum, row) => sum + row.calc.total, 0);
		const totalRevenu = resultRows.reduce((sum, row) => sum + row.revenu, 0);
		const margeMoy = totalVente > 0 ? (totalRevenu / totalVente) * 100 : 0;
		const health =
			margeMoy >= 16
				? tr(locale, "Forte", "Strong")
				: margeMoy >= 10
					? tr(locale, "Solide", "Solid")
					: margeMoy >= 6
						? tr(locale, "A surveiller", "Watch")
						: tr(locale, "Faible", "Low");
		return {
			totalVente,
			totalRevenu,
			margeMoy,
			health,
		};
	}, [locale, resultRows]);

	const filteredTrips = useMemo(() => {
		if (!draft.clientId) return trips;
		return trips.filter((trip) => trip.clientId === draft.clientId);
	}, [draft.clientId, trips]);

	const selectedTrip = useMemo(() => {
		return trips.find((trip) => trip.id === draft.tripId) || null;
	}, [draft.tripId, trips]);

	const airlineOptions = useMemo(() => {
		const fromSuppliers = Array.isArray(airlineSuppliers) ? airlineSuppliers.map((row) => row?.name).filter(Boolean) : [];
		const merged = [...fromSuppliers, ...(Array.isArray(iataAirlines) ? iataAirlines : [])];
		return Array.from(new Set(merged.map((name) => String(name).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
	}, [airlineSuppliers, iataAirlines]);

	const airportOptions = useMemo(() => {
		const list = Array.isArray(iataAirports) ? iataAirports : [];
		return list
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
	}, [iataAirports]);

	const normalizedCruiseLineOptions = useMemo(() => {
		return (Array.isArray(cruiseLineOptions) ? cruiseLineOptions : [])
			.map((option) => ({
				id: String(option?.id || option?.value || option?.label || ""),
				value: String(option?.label || option?.value || ""),
				label: String(option?.label || option?.value || ""),
			}))
			.filter((option) => option.value && option.label);
	}, [cruiseLineOptions]);

	const normalizedCruiseShipOptions = useMemo(() => {
		return (Array.isArray(cruiseShipOptions) ? cruiseShipOptions : [])
			.map((option) => ({
				id: String(option?.id || option?.value || option?.label || ""),
				value: String(option?.label || option?.value || ""),
				label: String(option?.label || option?.value || ""),
				lineId: option?.lineId ? String(option.lineId) : null,
				lineName: option?.lineName ? String(option.lineName) : null,
			}))
			.filter((option) => option.value && option.label);
	}, [cruiseShipOptions]);

	const normalizedCruisePortOptions = useMemo(() => {
		return (Array.isArray(cruisePortOptions) ? cruisePortOptions : [])
			.map((option) => ({
				id: String(option?.id || option?.value || option?.label || ""),
				value: String(option?.label || option?.value || ""),
				label: String(option?.label || option?.value || ""),
			}))
			.filter((option) => option.value && option.label);
	}, [cruisePortOptions]);

	const selectedCruiseLine = useMemo(() => {
		return normalizedCruiseLineOptions.find((option) => option.value === draft.compagnie || option.label === draft.compagnie) || null;
	}, [draft.compagnie, normalizedCruiseLineOptions]);

	const filteredCruiseShipOptions = useMemo(() => {
		const lineLabel = selectedCruiseLine?.label || draft.compagnie;
		const lineId = selectedCruiseLine?.id || null;
		if (!lineLabel) return normalizedCruiseShipOptions;

		const linked = lineId ? normalizedCruiseShipOptions.filter((ship) => ship.lineId === lineId) : [];
		if (linked.length > 0) return linked;

		const linkedByName = normalizedCruiseShipOptions.filter((ship) => ship.lineName && ship.lineName === lineLabel);
		if (linkedByName.length > 0) return linkedByName;

		return normalizedCruiseShipOptions.filter((ship) => matchesCruiseLineShip(ship.label, lineLabel));
	}, [draft.compagnie, normalizedCruiseShipOptions, selectedCruiseLine]);

	const volsAllerSegments = useMemo(() => normalizeFlightSegments(draft.volsAllerSegments), [draft.volsAllerSegments]);
	const volsRetourSegments = useMemo(() => normalizeFlightSegments(draft.volsRetourSegments), [draft.volsRetourSegments]);

	function setField(field, value) {
		setDraft((prev) => ({ ...prev, [field]: value }));
	}

	function setNested(section, key, value) {
		setDraft((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[key]: value,
			},
		}));
	}

	function setFlightSegments(direction, updater) {
		const key = direction === "retour" ? "volsRetourSegments" : "volsAllerSegments";
		setDraft((prev) => {
			const current = normalizeFlightSegments(prev[key]);
			const nextRaw = typeof updater === "function" ? updater(current) : updater;
			return {
				...prev,
				[key]: normalizeFlightSegments(nextRaw),
			};
		});
	}

	function updateFlightSegment(direction, index, field, value) {
		setFlightSegments(direction, (segments) =>
			segments.map((segment, i) => {
				if (i !== index) return segment;
				const nextValue = field === "fromIata" || field === "toIata" ? normalizeIata(value) : value;
				return { ...segment, [field]: nextValue };
			}),
		);
	}

	function addFlightSegment(direction) {
		setFlightSegments(direction, (segments) => [...segments, createFlightSegment()]);
	}

	function removeFlightSegment(direction, index) {
		setFlightSegments(direction, (segments) => {
			if (segments.length <= 1) return [createFlightSegment()];
			return segments.filter((_, i) => i !== index);
		});
	}

	async function refreshRevisions(projectId) {
		if (!projectId) {
			setRevisions([]);
			setLoadingRevisions(false);
			return;
		}

		setLoadingRevisions(true);
		try {
			const response = await fetch(`/api/forfaits/${projectId}/revisions`);
			if (!response.ok) throw new Error("revisions_failed");
			const data = await response.json();
			setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
		} catch {
			setRevisions([]);
		} finally {
			setLoadingRevisions(false);
		}
	}

	function toggleHotelPre(checked) {
		const next = Boolean(checked);
		setHotelPre(next);
		setField("hasPre", next);
	}

	function toggleHotelPost(checked) {
		const next = Boolean(checked);
		setHotelPost(next);
		setField("hasPost", next);
	}

	function resetAll() {
		const nextDraft = makeDefaultDraft();
		setDraft(nextDraft);
		setHotelPre(nextDraft.hasPre);
		setHotelPost(nextDraft.hasPost);
		setRevisions([]);
		setSelectedProjectId("");
		setNotice(tr(locale, "Nouveau dossier initialise.", "New project initialized."));
	}

	function buildMutationBody(projectIdOverride) {
		return {
			id: projectIdOverride || selectedProjectId || undefined,
			name: (draft.projectName || "").trim() || tr(locale, "Dossier sans titre", "Untitled project"),
			clientId: draft.clientId || null,
			tripId: draft.tripId || null,
			payload: draft,
			constants,
			currency: "CAD",
			passengers: Math.max(1, Number.parseInt(String(draft.pax || 1), 10) || 1),
			totalSaleCents: Math.round(summary.totalVente * 100),
			totalRevenueCents: Math.round(summary.totalRevenu * 100),
			avgMarginPct: Number(summary.margeMoy.toFixed(3)),
		};
	}

	async function saveProject() {
		setBusy(true);
		try {
			const response = await fetch("/api/forfaits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildMutationBody()),
			});

			if (!response.ok) throw new Error("save_failed");

			const data = await response.json();
			const project = data.project;
			const normalized = {
				...project,
				draft: project.payload || makeDefaultDraft(),
			};

			setProjects((prev) => {
				const idx = prev.findIndex((item) => item.id === normalized.id);
				if (idx === -1) return [normalized, ...prev];
				const next = prev.slice();
				next[idx] = normalized;
				return next;
			});
			setSelectedProjectId(normalized.id);
			refreshRevisions(normalized.id);
			setNotice(`${tr(locale, "Projet enregistre", "Project saved")}: ${normalized.name}`);
		} catch {
			setNotice(tr(locale, "Enregistrement impossible. Verifie la connexion et reessaie.", "Could not save. Check your connection and try again."));
		} finally {
			setBusy(false);
		}
	}

	function loadProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;
		const nextDraft = { ...makeDefaultDraft(), ...(project.payload || project.draft || {}) };
		setDraft(nextDraft);
		setHotelPre(Boolean(nextDraft.hasPre));
		setHotelPost(Boolean(nextDraft.hasPost));
		setConstants({ ...DEFAULT_CONSTANTS, ...(project.constants || {}) });
		setSelectedProjectId(project.id);
		refreshRevisions(project.id);
		setNotice(`${tr(locale, "Projet charge", "Project loaded")}: ${project.name}`);
	}

	async function duplicateProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		setBusy(true);
		try {
			const body = {
				name: `${project.name} (${tr(locale, "copie", "copy")})`,
				clientId: project.clientId || null,
				tripId: project.tripId || null,
				payload: project.payload || project.draft || makeDefaultDraft(),
				constants: project.constants || DEFAULT_CONSTANTS,
				currency: project.currency || "CAD",
				passengers: project.passengers || 1,
				totalSaleCents: project.totalSaleCents || 0,
				totalRevenueCents: project.totalRevenueCents || 0,
				avgMarginPct: project.avgMarginPct || 0,
			};
			const response = await fetch("/api/forfaits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error("duplicate_failed");
			const data = await response.json();
			const duplicated = {
				...data.project,
				draft: data.project.payload || makeDefaultDraft(),
			};
			setProjects((prev) => [duplicated, ...prev]);
			setNotice(tr(locale, "Copie creee.", "Copy created."));
		} catch {
			setNotice(tr(locale, "Duplication impossible.", "Could not duplicate project."));
		} finally {
			setBusy(false);
		}
	}

	async function deleteProject(projectId) {
		setBusy(true);
		try {
			const response = await fetch(`/api/forfaits/${projectId}`, { method: "DELETE" });
			if (!response.ok && response.status !== 204) throw new Error("delete_failed");

			setProjects((prev) => prev.filter((item) => item.id !== projectId));
			if (selectedProjectId === projectId) setSelectedProjectId("");
			setNotice(tr(locale, "Projet supprime.", "Project deleted."));
		} catch {
			setNotice(tr(locale, "Suppression impossible.", "Could not delete project."));
		} finally {
			setBusy(false);
		}
	}

	function exportJson() {
		const payload = {
			version: 1,
			exportedAt: new Date().toISOString(),
			draft,
			constants,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
		const a = document.createElement("a");
		const name = (draft.projectName || "forfait").replace(/\s+/g, "-").toLowerCase();
		a.href = URL.createObjectURL(blob);
		a.download = `${name}.forfait.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(a.href), 1500);
		setNotice(tr(locale, "Export JSON telecharge.", "JSON export downloaded."));
	}

	function exportCsv() {
		const rows = [
			["champ", "valeur"],
			["__meta_exported_at", new Date().toISOString()],
			["__meta_project", draft.projectName || ""],
		];
		flattenDraftToCsvRows(draft).forEach((item) => rows.push(item));
		const csv = `\ufeff${rows.map((r) => `${asCsvCell(r[0])},${asCsvCell(r[1])}`).join("\r\n")}`;
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		const name = (draft.projectName || "forfait").replace(/\s+/g, "-").toLowerCase();
		a.href = URL.createObjectURL(blob);
		a.download = `${name}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(a.href), 1500);
		setNotice(tr(locale, "Export CSV telecharge.", "CSV export downloaded."));
	}

	async function exportExcel() {
		try {
			const XLSX = await import("xlsx");
			const wb = XLSX.utils.book_new();

			const overviewRows = [
				[tr(locale, "Projet", "Project"), draft.projectName || tr(locale, "Sans titre", "Untitled")],
				[tr(locale, "Client", "Client"), clients.find((c) => c.id === draft.clientId)?.name || "-"],
				[tr(locale, "Voyage", "Trip"), selectedTrip?.name || "-"],
				[tr(locale, "Passagers", "Passengers"), base.pax],
				[tr(locale, "Nuits croisiere", "Cruise nights"), base.nuits],
				[tr(locale, "Nuits totales", "Total nights"), base.totalNuits],
				[tr(locale, "Vente estimee", "Estimated sales"), summary.totalVente],
				[tr(locale, "Revenu estime", "Estimated revenue"), summary.totalRevenu],
				[tr(locale, "Marge moyenne (%)", "Average margin (%)"), Number(summary.margeMoy.toFixed(2))],
			];

			const pricingRows = [
				[
					tr(locale, "Categorie", "Category"),
					tr(locale, "Facture cabine", "Cabin invoice"),
					tr(locale, "Prix / personne", "Price / person"),
					tr(locale, "Prix / pers / nuit", "Price / person / night"),
					tr(locale, "Total groupe", "Group total"),
					tr(locale, "TAAP pre", "TAAP pre"),
					tr(locale, "TAAP post", "TAAP post"),
					tr(locale, "Perte absorbee / pers", "Absorbed loss / person"),
				],
				...resultRows.map((row) => [
					row.label,
					row.facture,
					row.calc.prixPers,
					row.calc.prixPersNuit,
					row.calc.total,
					base.hotelClientChambre,
					base.hasPost ? base.hotelClientChambrePost : 0,
					base.perte,
				]),
			];

			const revenueRows = [
				[
					tr(locale, "Categorie", "Category"),
					tr(locale, "Commission croisiere", "Cruise commission"),
					tr(locale, "Revenu total", "Total revenue"),
					tr(locale, "Marge (%)", "Margin (%)"),
				],
				...resultRows.map((row) => [row.label, row.commCroisiere, row.revenu, Number(row.margePct.toFixed(2))]),
			];

			const inputsRows = flattenDraftToCsvRows(draft);

			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), tr(locale, "Apercu", "Overview"));
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pricingRows), tr(locale, "Tarification", "Pricing"));
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueRows), tr(locale, "Revenu", "Revenue"));
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inputsRows), tr(locale, "Entrees", "Inputs"));

			const safe = (draft.projectName || "forfait")
				.replace(/[^a-zA-Z0-9- ]/g, "")
				.trim()
				.replace(/\s+/g, "-")
				.toLowerCase();
			XLSX.writeFile(wb, `${safe || "forfait"}-interne.xlsx`);
			setNotice(tr(locale, "Export Excel interne telecharge.", "Internal Excel export downloaded."));
		} catch {
			setNotice(tr(locale, "Export Excel impossible.", "Could not export Excel."));
		}
	}

	function buildPdfPayload() {
		return {
			draft,
			base,
			summary,
			resultRows,
			selectedClient: clients.find((c) => c.id === draft.clientId) || null,
			selectedTrip,
		};
	}

	async function exportPdf() {
		try {
			const response = await fetch("/api/forfaits/pdf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildPdfPayload()),
			});
			if (!response.ok) throw new Error("pdf_failed");

			const blob = await response.blob();
			const a = document.createElement("a");
			const safe = (draft.projectName || "forfait")
				.replace(/[^a-zA-Z0-9- ]/g, "")
				.trim()
				.replace(/\s+/g, "-")
				.toLowerCase();
			a.href = URL.createObjectURL(blob);
			a.download = `${safe || "forfait"}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(a.href), 1500);
			setNotice(tr(locale, "PDF client telecharge.", "Client PDF downloaded."));
		} catch {
			setNotice(tr(locale, "Export PDF impossible.", "Could not export PDF."));
		}
	}

	async function convertToQuote() {
		if (!selectedProjectId) {
			setNotice(tr(locale, "Enregistre d'abord le forfait pour le convertir en devis.", "Save the package before converting it to a quote."));
			return;
		}
		if (!draft.tripId) {
			setNotice(tr(locale, "Selectionne un voyage avant conversion en devis.", "Select a trip before converting to a quote."));
			return;
		}

		setBusy(true);
		try {
			const response = await fetch(`/api/forfaits/${selectedProjectId}/convert-to-quote`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setNotice(data?.error || tr(locale, "Conversion en devis impossible.", "Could not convert to quote."));
				return;
			}

			setNotice(tr(locale, "Devis cree avec succes. Ouverture de l'onglet devis du voyage.", "Quote created successfully. Opening the trip quotes tab."));
			if (data?.redirectTo) {
				window.location.assign(data.redirectTo);
			}
		} catch {
			setNotice(tr(locale, "Conversion en devis impossible.", "Could not convert to quote."));
		} finally {
			setBusy(false);
		}
	}

	async function copySummary() {
		const lines = [];
		lines.push(`${tr(locale, "Projet", "Project")}: ${draft.projectName || tr(locale, "Sans titre", "Untitled")}`);
		if (selectedTrip) lines.push(`${tr(locale, "Voyage", "Trip")}: ${selectedTrip.name} (${selectedTrip.clientName})`);
		lines.push(`${tr(locale, "Passagers", "Passengers")}: ${base.pax}`);
		lines.push(`${tr(locale, "Nuits total", "Total nights")}: ${base.totalNuits}`);
		lines.push(`${tr(locale, "Vente estimee (toutes categories)", "Estimated sales (all categories)")}: ${fmtCad(summary.totalVente)}`);
		lines.push(`${tr(locale, "Revenu estime (toutes categories)", "Estimated revenue (all categories)")}: ${fmtCad(summary.totalRevenu)}`);
		lines.push(`${tr(locale, "Marge moyenne", "Average margin")}: ${summary.margeMoy.toFixed(1)}% (${summary.health})`);
		lines.push("");
		resultRows.forEach((row) => {
			lines.push(
				`- ${row.label}: ${fmtCad(row.calc.prixPers)} / ${tr(locale, "pers", "person")} | ${fmtCad(row.calc.total)} ${tr(locale, "total", "total")} | ${tr(locale, "marge", "margin")} ${row.margePct.toFixed(1)}%`,
			);
		});

		try {
			await navigator.clipboard.writeText(lines.join("\n"));
			setNotice(tr(locale, "Synthese copiee dans le presse-papiers.", "Summary copied to clipboard."));
		} catch {
			setNotice(tr(locale, "Copie impossible depuis ce navigateur.", "Copy is not available in this browser."));
		}
	}

	async function handleImportJson(event) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			const nextDraft = parsed?.draft;
			const nextConstants = parsed?.constants;
			if (!nextDraft || !nextConstants) {
				setNotice(tr(locale, "Fichier JSON invalide.", "Invalid JSON file."));
				return;
			}
			setDraft({ ...makeDefaultDraft(), ...nextDraft });
			setConstants({ ...DEFAULT_CONSTANTS, ...nextConstants });
			setSelectedProjectId("");
			setNotice(tr(locale, "JSON importe.", "JSON imported."));
		} catch {
			setNotice(tr(locale, "Import JSON impossible.", "Could not import JSON."));
		}
	}

	async function handleImportCsv(event) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		try {
			const rows = parseCsvRows(await file.text());
			const seed = makeDefaultDraft();
			rows.forEach((r) => {
				const key = r[0];
				if (!key || key === "champ" || key.startsWith("__meta_")) return;
				setByPath(seed, key, r.slice(1).join(","));
			});
			setDraft(seed);
			setSelectedProjectId("");
			setNotice(tr(locale, "CSV importe.", "CSV imported."));
		} catch {
			setNotice(tr(locale, "Import CSV impossible.", "Could not import CSV."));
		}
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-3xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{tr(locale, "Moteur forfaits", "Packages engine")}</p>
						<CardTitle className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
							{tr(locale, "Calculateur de forfaits croisiere", "Cruise package calculator")}
						</CardTitle>
						<p className="text-sm leading-6 text-muted-foreground">
							{tr(
								locale,
								"Outil integree de planification de forfaits croisiere, suivi de marge et sauvegarde de dossiers.",
								"Integrated cruise package planning tool with margin tracking and project persistence.",
							)}
						</p>
					</div>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="projectName">{tr(locale, "Nom du dossier", "Project name")}</Label>
						<Input
							id="projectName"
							value={draft.projectName}
							onChange={(event) => setField("projectName", event.target.value)}
							placeholder={tr(locale, "Ex: Caraibes - Famille Tremblay", "Example: Caribbean - Tremblay Family")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="clientId">{tr(locale, "Client", "Client")}</Label>
						<select
							id="clientId"
							value={draft.clientId}
							onChange={(event) => {
								const clientId = event.target.value;
								setDraft((prev) => ({
									...prev,
									clientId,
									tripId: prev.tripId && trips.some((trip) => trip.id === prev.tripId && trip.clientId === clientId) ? prev.tripId : "",
								}));
							}}
							className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<option value="">{tr(locale, "Aucun client", "No client")}</option>
							{clients.map((client) => (
								<option
									key={client.id}
									value={client.id}
								>
									{client.name}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="tripId">{tr(locale, "Voyage", "Trip")}</Label>
						<select
							id="tripId"
							value={draft.tripId}
							onChange={(event) => setField("tripId", event.target.value)}
							className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<option value="">{tr(locale, "Aucun voyage", "No trip")}</option>
							{filteredTrips.map((trip) => (
								<option
									key={trip.id}
									value={trip.id}
								>
									{trip.name} - {trip.clientName}
								</option>
							))}
						</select>
					</div>
				</CardContent>
			</Card>

			{/* WORKBENCH TABS */}
			<div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/70 p-1">
				{TAB_ITEMS.map((item) => (
					<Button
						key={item.id}
						type="button"
						variant={tab === item.id ? "default" : "ghost"}
						size="sm"
						className="rounded-xl"
						onClick={() => setTab(item.id)}
					>
						{item.id === "croisiere"
							? tr(locale, "Croisiere", "Cruise")
							: item.id === "vols"
								? tr(locale, "Vols", "Flights")
								: item.id === "hotel"
									? tr(locale, "Hotels & Transferts", "Hotels & Transfers")
									: item.id === "sommaire"
										? tr(locale, "Sommaire", "Summary")
										: tr(locale, "Parametres", "Parameters")}
					</Button>
				))}
			</div>

			{/* CROISIERE TAB */}
			{tab === "croisiere" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Cadre du voyage", "Trip setup")}</CardTitle>
							<CardDescription>
								{tr(
									locale,
									"Infos croisiere, passagers, taux de change et categories cabine.",
									"Cruise info, passengers, exchange rate, and cabin categories.",
								)}
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<Field label={tr(locale, "Compagnie", "Cruise line")}>
								<CruiseSearchSelect
									value={draft.compagnie}
									onValueChange={(value) => {
										setField("compagnie", value);
										setField("navire", "");
									}}
									options={normalizedCruiseLineOptions}
									placeholder={tr(locale, "Selectionner compagnie", "Select cruise line")}
									searchPlaceholder={tr(locale, "Rechercher compagnie...", "Search cruise line...")}
									emptyMessage={tr(locale, "Aucune compagnie trouvee.", "No cruise line found.")}
								/>
							</Field>
							<Field label={tr(locale, "Navire", "Ship")}>
								<CruiseSearchSelect
									value={draft.navire}
									onValueChange={(value) => setField("navire", value)}
									options={filteredCruiseShipOptions}
									placeholder={
										draft.compagnie
											? tr(locale, "Selectionner navire", "Select ship")
											: tr(locale, "Selectionner compagnie d'abord", "Select cruise line first")
									}
									searchPlaceholder={tr(locale, "Rechercher navire...", "Search ship...")}
									emptyMessage={
										draft.compagnie
											? tr(locale, "Aucun navire trouve pour cette compagnie.", "No ship found for this line.")
											: tr(locale, "Selectionne une compagnie d'abord.", "Select a cruise line first.")
									}
									disabled={!draft.compagnie}
								/>
							</Field>
							<Field label={tr(locale, "Port depart", "Departure port")}>
								<CruiseSearchSelect
									value={draft.portDepart}
									onValueChange={(value) => setField("portDepart", value)}
									options={normalizedCruisePortOptions}
									placeholder={tr(locale, "Selectionner port depart", "Select departure port")}
									searchPlaceholder={tr(locale, "Rechercher port depart...", "Search departure port...")}
									emptyMessage={tr(locale, "Aucun port trouve.", "No port found.")}
								/>
							</Field>
							<Field label={tr(locale, "Port arrivee", "Arrival port")}>
								<CruiseSearchSelect
									value={draft.portArrivee}
									onValueChange={(value) => setField("portArrivee", value)}
									options={normalizedCruisePortOptions}
									placeholder={tr(locale, "Selectionner port arrivee", "Select arrival port")}
									searchPlaceholder={tr(locale, "Rechercher port arrivee...", "Search arrival port...")}
									emptyMessage={tr(locale, "Aucun port trouve.", "No port found.")}
								/>
							</Field>
							<Field label={tr(locale, "Date debut croisiere", "Cruise start date")}>
								<Input
									type="date"
									value={draft.croisiereDebut}
									onChange={(e) => setField("croisiereDebut", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Date fin croisiere", "Cruise end date")}>
								<Input
									type="date"
									value={draft.croisiereFin}
									onChange={(e) => setField("croisiereFin", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Nombre passagers", "Number of passengers")}>
								<Input
									type="number"
									min="1"
									step="1"
									value={draft.pax}
									onChange={(e) => setField("pax", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Nuits croisiere", "Cruise nights")}>
								<Input
									type="number"
									min="0"
									step="1"
									value={draft.nuits}
									onChange={(e) => setField("nuits", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Pourboires manuels (si non inclus)", "Manual gratuities (if not included)")}>
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.pourboiresManuel}
									onChange={(e) => setField("pourboiresManuel", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Convertir USD en CAD", "Convert USD to CAD")}>
								<select
									value={String(draft.usdCab)}
									onChange={(e) => setField("usdCab", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
								>
									{yesNoOptions.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Cabines et commissions croisiere", "Cruise cabins and commissions")}</CardTitle>
							<CardDescription>
								{tr(locale, "Prix brut cabine et commission croisiere par categorie.", "Gross cabin fare and cruise commission by category.")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 md:grid-cols-2">
								{CABINS.map((cab) => (
									<Field
										key={cab.id}
										label={`${cab.label} - ${tr(locale, "cout cabine", "cabin cost")}`}
									>
										<Input
											type="number"
											min="0"
											step="0.01"
											value={draft.cabins[cab.id]}
											onChange={(e) => setNested("cabins", cab.id, e.target.value)}
										/>
									</Field>
								))}
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								{CABINS.map((cab) => (
									<Field
										key={`k_${cab.id}`}
										label={`${cab.label} - ${tr(locale, "commission", "commission")}`}
									>
										<Input
											type="number"
											min="0"
											step="0.01"
											value={draft.commissions[cab.id]}
											onChange={(e) => setNested("commissions", cab.id, e.target.value)}
										/>
									</Field>
								))}
								<Field
									label={tr(locale, "Notes croisiere", "Cruise notes")}
									className="md:col-span-2"
								>
									<Textarea
										rows={4}
										value={draft.croisiereNotes}
										onChange={(e) => setField("croisiereNotes", e.target.value)}
										placeholder={tr(
											locale,
											"Ex: Cette croisiere inclut les repas principaux, spectacles et taxes portuaires.",
											"Example: This cruise includes main meals, shows, and port taxes.",
										)}
									/>
								</Field>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* VOLS TAB */}
			{tab === "vols" && (
				<Card>
					<CardHeader>
						{/* <CardTitle>{tr(locale, "Vols et bagages", "Flights")}</CardTitle> */}
						<CardDescription>
							{tr(
								locale,
								"Segmente les vols aller/retour avec durees et escales calculees automatiquement.",
								"Split outbound/return flights with automatic duration and layover calculation.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						{/* VOLS ALLER */}
						<FlightSegmentsEditor
							title={tr(locale, "Vol aller", "Outbound flight")}
							locale={locale}
							direction="aller"
							segments={volsAllerSegments}
							airlineOptions={airlineOptions}
							airportOptions={airportOptions}
							onAdd={addFlightSegment}
							onRemove={removeFlightSegment}
							onUpdate={updateFlightSegment}
						/>

						{/* VOLS RETOUR */}
						<FlightSegmentsEditor
							title={tr(locale, "Vol retour", "Return flight")}
							locale={locale}
							direction="retour"
							segments={volsRetourSegments}
							airlineOptions={airlineOptions}
							airportOptions={airportOptions}
							onAdd={addFlightSegment}
							onRemove={removeFlightSegment}
							onUpdate={updateFlightSegment}
						/>

						{/* TARIFICATION VOLS */}
						<div className="grid gap-3 md:grid-cols-2">
							<MoneyWithMode
								label={tr(locale, "Cout vols", "Flight cost")}
								value={draft.vols}
								mode={draft.volsMode}
								onValue={(v) => setField("vols", v)}
								onMode={(v) => setField("volsMode", v)}
								className="w-full md:col-span-2"
							/>
							<div className="flex items-center gap-3 w-full md:col-span-2">
								<MoneyWithMode
									label={tr(locale, "Bagages aller", "Outbound baggage")}
									value={draft.bagAller}
									mode={draft.bagAllerMode}
									onValue={(v) => setField("bagAller", v)}
									onMode={(v) => setField("bagAllerMode", v)}
									className="flex-1 min-w-0"
								/>
								<MoneyWithMode
									label={tr(locale, "Bagages retour", "Return baggage")}
									value={draft.bagRetour}
									mode={draft.bagRetourMode}
									onValue={(v) => setField("bagRetour", v)}
									onMode={(v) => setField("bagRetourMode", v)}
									className="flex-1 min-w-0"
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* HOTEL TAB */}
			{tab === "hotel" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Hotels", "Hotels")}</CardTitle>
							<CardDescription>{tr(locale, "Ajouter les sejours et des nuits facturees.", "Add hotel stays and billed nights.")}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<div className="space-y-4 md:col-span-2">
								<label className="flex items-center gap-2 text-sm font-medium">
									<Checkbox
										checked={hotelPre}
										onCheckedChange={toggleHotelPre}
									/>
									{tr(locale, "Sejour pre-croisiere", "Pre-cruise stay")}
								</label>
								{hotelPre ? (
									<div className="grid gap-3 md:grid-cols-2">
										<Field
											label={tr(locale, "Hotel pre-croisiere", "Pre-cruise hotel")}
											className="md:col-span-2"
										>
											<Input
												value={draft.hotelNom}
												onChange={(e) => setField("hotelNom", e.target.value)}
											/>
										</Field>

										<div className="md:col-span-2 grid gap-3 md:grid-cols-3">
											<Field label={tr(locale, "Date arrivee pre", "Pre-stay check-in date")}>
												<Input
													type="date"
													value={draft.hotelDebut}
													onChange={(e) => setField("hotelDebut", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Nuits pre", "Pre-stay nights")}>
												<Input
													type="number"
													min="0"
													value={draft.nuitsHotel}
													onChange={(e) => setField("nuitsHotel", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Date depart pre", "Pre-stay check-out date")}>
												<Input
													type="date"
													value={draft.hotelFin}
													onChange={(e) => setField("hotelFin", e.target.value)}
												/>
											</Field>
										</div>
										<Field label={tr(locale, "Cout hotel pre / nuit", "Pre-stay hotel cost / night")}>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={draft.hotelNuit}
												onChange={(e) => setField("hotelNuit", e.target.value)}
											/>
										</Field>
										<Field label={tr(locale, "Commission hotel pre", "Pre-stay hotel commission")}>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={draft.commissionHotelPre}
												onChange={(e) => setField("commissionHotelPre", e.target.value)}
											/>
										</Field>
									</div>
								) : null}
							</div>

							<div className="space-y-4 md:col-span-2">
								<label className="flex items-center gap-2 text-sm font-medium">
									<Checkbox
										checked={hotelPost}
										onCheckedChange={toggleHotelPost}
									/>
									{tr(locale, "Sejour post-croisiere", "Post-cruise stay")}
								</label>
								{hotelPost ? (
									<div className="grid gap-3 md:grid-cols-2">
										<Field
											label={tr(locale, "Hotel post-croisiere", "Post-cruise hotel")}
											className="md:col-span-2"
										>
											<Input
												value={draft.hotelPostNom}
												onChange={(e) => setField("hotelPostNom", e.target.value)}
											/>
										</Field>

										<div className="md:col-span-2 grid gap-3 md:grid-cols-3">
											<Field label={tr(locale, "Date arrivee post", "Post-stay check-in date")}>
												<Input
													type="date"
													value={draft.hotelPostDebut}
													onChange={(e) => setField("hotelPostDebut", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Nuits post", "Post-stay nights")}>
												<Input
													type="number"
													min="0"
													value={draft.nuitsHotelPost}
													onChange={(e) => setField("nuitsHotelPost", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Date depart post", "Post-stay check-out date")}>
												<Input
													type="date"
													value={draft.hotelPostFin}
													onChange={(e) => setField("hotelPostFin", e.target.value)}
												/>
											</Field>
										</div>
										<Field label={tr(locale, "Cout hotel post / nuit", "Post-stay hotel cost / night")}>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={draft.hotelNuitPost}
												onChange={(e) => setField("hotelNuitPost", e.target.value)}
											/>
										</Field>
										<Field label={tr(locale, "Commission hotel post", "Post-stay hotel commission")}>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={draft.commissionHotelPost}
												onChange={(e) => setField("commissionHotelPost", e.target.value)}
											/>
										</Field>
									</div>
								) : null}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Transferts", "Transfers")}</CardTitle>
							<CardDescription>
								{tr(locale, "Segments aeroport/hotel/port avec mode total ou par personne.", "Airport/hotel/port segments in total or per-person mode.")}
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<Field
								label={tr(locale, "Transferts actives", "Transfers enabled")}
								className="md:col-span-2"
							>
								<select
									value={String(draft.hasTransferts)}
									onChange={(e) => setField("hasTransferts", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									{yesNoOptions.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
							<MoneyWithMode
								label={tr(locale, "Aeroport -> Hotel", "Airport -> Hotel")}
								value={draft.trA}
								mode={draft.trAMode}
								onValue={(v) => setField("trA", v)}
								onMode={(v) => setField("trAMode", v)}
							/>
							<MoneyWithMode
								label={tr(locale, "Hotel -> Port", "Hotel -> Port")}
								value={draft.trB}
								mode={draft.trBMode}
								onValue={(v) => setField("trB", v)}
								onMode={(v) => setField("trBMode", v)}
							/>
							<MoneyWithMode
								label={tr(locale, "Port -> Aeroport", "Port -> Airport")}
								value={draft.trC}
								mode={draft.trCMode}
								onValue={(v) => setField("trC", v)}
								onMode={(v) => setField("trCMode", v)}
							/>
							{hotelPost ? (
								<>
									<MoneyWithMode
										label={tr(locale, "Port -> Hotel post", "Port -> Post-stay hotel")}
										value={draft.trD}
										mode={draft.trDMode}
										onValue={(v) => setField("trD", v)}
										onMode={(v) => setField("trDMode", v)}
									/>
									<MoneyWithMode
										label={tr(locale, "Hotel post -> Aeroport", "Post-stay hotel -> Airport")}
										value={draft.trE}
										mode={draft.trEMode}
										onValue={(v) => setField("trE", v)}
										onMode={(v) => setField("trEMode", v)}
									/>
								</>
							) : null}
							<Field label={tr(locale, "Compagnie A->H", "Carrier A->H")}>
								<Input
									value={draft.trAComp}
									onChange={(e) => setField("trAComp", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Compagnie H->P", "Carrier H->P")}>
								<Input
									value={draft.trBComp}
									onChange={(e) => setField("trBComp", e.target.value)}
								/>
							</Field>
							<Field label={tr(locale, "Compagnie P->A", "Carrier P->A")}>
								<Input
									value={draft.trCComp}
									onChange={(e) => setField("trCComp", e.target.value)}
								/>
							</Field>
							<Field
								label={tr(locale, "Commission transferts", "Transfer commission")}
								className="md:col-span-2"
							>
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.commissionTransferts}
									onChange={(e) => setField("commissionTransferts", e.target.value)}
								/>
							</Field>
						</CardContent>
					</Card>
				</div>
			)}

			{/* PARAMETRES TAB */}
			{tab === "parametres" && (
				<Card>
					<CardHeader>
						<CardTitle>{tr(locale, "Parametres", "Parameters")}</CardTitle>
						<CardDescription>
							{tr(locale, "Parametres globaux de pricing et du revenu agence.", "Global pricing and agency revenue parameters.")}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2">
						<Field label={tr(locale, "Frais admin / passager", "Admin fee / passenger")}>
							<Input
								type="number"
								min="0"
								step="0.01"
								value={constants.admin}
								onChange={(e) => setConstants((prev) => ({ ...prev, admin: toNumber(e.target.value) }))}
							/>
						</Field>
						<Field label={tr(locale, "Frais service vols (%)", "Flight service fee (%)")}>
							<Input
								type="number"
								min="0"
								step="0.1"
								value={constants.pctVols}
								onChange={(e) => setConstants((prev) => ({ ...prev, pctVols: toNumber(e.target.value) }))}
							/>
						</Field>
						<Field label={tr(locale, "Markup hotel max (%)", "Max hotel markup (%)")}>
							<Input
								type="number"
								min="0"
								step="0.1"
								value={constants.pctMarkup}
								onChange={(e) => setConstants((prev) => ({ ...prev, pctMarkup: toNumber(e.target.value) }))}
							/>
						</Field>
						<Field label={tr(locale, "Pourboires / nuit / pers", "Gratuities / night / person")}>
							<Input
								type="number"
								min="0"
								step="0.01"
								value={constants.pourboiresNuit}
								onChange={(e) => setConstants((prev) => ({ ...prev, pourboiresNuit: toNumber(e.target.value) }))}
							/>
						</Field>
						<Field label={tr(locale, "Arrondi prix / pers", "Price rounding / person")}>
							<select
								value={String(constants.arrondi)}
								onChange={(e) => setConstants((prev) => ({ ...prev, arrondi: toNumber(e.target.value) }))}
								className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
							>
								<option value="0">{tr(locale, "Aucun", "None")}</option>
								<option value="5">{tr(locale, "Au 5 CAD", "To nearest 5 CAD")}</option>
								<option value="10">{tr(locale, "Au 10 CAD", "To nearest 10 CAD")}</option>
								<option value="25">{tr(locale, "Au 25 CAD", "To nearest 25 CAD")}</option>
								<option value="50">{tr(locale, "Au 50 CAD", "To nearest 50 CAD")}</option>
							</select>
						</Field>
						<Field label={tr(locale, "Taux USD/CAD", "USD/CAD rate")}>
							<Input
								type="number"
								min="0"
								step="0.0001"
								value={draft.taux}
								onChange={(e) => setField("taux", e.target.value)}
							/>
						</Field>
					</CardContent>
				</Card>
			)}

			{/* SOMMAIRE TAB */}
			{tab === "sommaire" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Dossier et export", "Project and export")}</CardTitle>
							<CardDescription>
								{tr(locale, "Enregistre, duplique, importe et exporte ton dossier de forfait.", "Save, duplicate, import, and export your package project.")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<Field label={tr(locale, "Depot / personne", "Deposit / person")}>
									<Input
										type="number"
										min="0"
										step="0.01"
										value={draft.depot}
										onChange={(e) => setField("depot", e.target.value)}
									/>
								</Field>
								<Field label={tr(locale, "Date limite depot", "Deposit due date")}>
									<Input
										type="date"
										value={draft.depotDate}
										onChange={(e) => setField("depotDate", e.target.value)}
									/>
								</Field>
								<Field label={tr(locale, "Date limite solde", "Final payment due date")}>
									<Input
										type="date"
										value={draft.soldeDate}
										onChange={(e) => setField("soldeDate", e.target.value)}
									/>
								</Field>
							</div>
							<Field label={tr(locale, "Notes internes", "Internal notes")}>
								<Textarea
									rows={5}
									value={draft.notes}
									onChange={(e) => setField("notes", e.target.value)}
								/>
							</Field>

							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									onClick={saveProject}
									disabled={busy}
								>
									<Save /> {tr(locale, "Enregistrer", "Save")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={resetAll}
									disabled={busy}
								>
									<Calculator /> {tr(locale, "Nouveau", "New")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportPdf}
								>
									<FileText /> {tr(locale, "Export PDF client", "Client PDF export")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={convertToQuote}
									disabled={busy || !selectedProjectId || !draft.tripId}
								>
									<FileText /> {tr(locale, "Convertir en devis", "Convert to quote")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportExcel}
								>
									<Download /> {tr(locale, "Export Excel interne", "Internal Excel export")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportJson}
								>
									<Download /> {tr(locale, "Export JSON", "Export JSON")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportCsv}
								>
									<Download /> {tr(locale, "Export CSV", "Export CSV")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => importJsonRef.current?.click()}
								>
									<Upload /> {tr(locale, "Import JSON", "Import JSON")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => importCsvRef.current?.click()}
								>
									<Upload /> {tr(locale, "Import CSV", "Import CSV")}
								</Button>
								<Button
									type="button"
									variant="secondary"
									onClick={copySummary}
								>
									<Copy /> {tr(locale, "Copier synthese", "Copy summary")}
								</Button>
								<input
									ref={importJsonRef}
									type="file"
									accept="application/json,.json"
									className="hidden"
									onChange={handleImportJson}
								/>
								<input
									ref={importCsvRef}
									type="file"
									accept="text/csv,.csv"
									className="hidden"
									onChange={handleImportCsv}
								/>
							</div>

							{notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{tr(locale, "Projets enregistres", "Saved projects")}</CardTitle>
							<CardDescription>
								{tr(locale, "Persistance Prisma reliee au CRM et partageable sur le VPS.", "Prisma persistence linked to CRM and shareable on the VPS.")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{projects.length === 0 ? (
								<p className="text-sm text-muted-foreground">{tr(locale, "Aucun projet enregistre pour le moment.", "No saved project yet.")}</p>
							) : (
								projects.map((project) => (
									<div
										key={project.id}
										className={cn(
											"flex items-center justify-between rounded-xl border p-2",
											project.id === selectedProjectId && "border-primary/60 bg-primary/5",
										)}
									>
										<div>
											<p className="text-sm font-medium">{project.name}</p>
											<p className="text-xs text-muted-foreground">
												{tr(locale, "Maj", "Updated")}: {new Date(project.updatedAt).toLocaleString(locale === "en" ? "en-CA" : "fr-CA")} ·{" "}
												{tr(locale, "Rev", "Rev")} {project.currentRevision || 1}
												{typeof project.revisionCount === "number" ? ` (${project.revisionCount})` : ""}
											</p>
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												size="icon-sm"
												variant="ghost"
												onClick={() => loadProject(project.id)}
												title={tr(locale, "Charger", "Load")}
												disabled={busy}
											>
												<FolderOpen />
											</Button>
											<Button
												type="button"
												size="icon-sm"
												variant="ghost"
												onClick={() => duplicateProject(project.id)}
												title={tr(locale, "Dupliquer", "Duplicate")}
												disabled={busy}
											>
												<Copy />
											</Button>
											<Button
												type="button"
												size="icon-sm"
												variant="destructive"
												onClick={() => deleteProject(project.id)}
												title={tr(locale, "Supprimer", "Delete")}
												disabled={busy}
											>
												<Trash2 />
											</Button>
										</div>
									</div>
								))
							)}

							{selectedProjectId ? (
								<div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
									<p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{tr(locale, "Historique des revisions", "Revision history")}
									</p>
									{loadingRevisions ? (
										<p className="text-xs text-muted-foreground">{tr(locale, "Chargement...", "Loading...")}</p>
									) : revisions.length === 0 ? (
										<p className="text-xs text-muted-foreground">{tr(locale, "Aucune revision disponible.", "No revision available.")}</p>
									) : (
										<div className="space-y-1">
											{revisions.map((rev) => (
												<div
													key={rev.id}
													className="flex items-center justify-between rounded-lg border border-border/50 bg-background/70 px-2 py-1"
												>
													<span className="text-xs font-medium">
														{tr(locale, "Revision", "Revision")} {rev.revisionNumber}
													</span>
													<span className="text-[11px] text-muted-foreground">
														{new Date(rev.createdAt).toLocaleString(locale === "en" ? "en-CA" : "fr-CA")}
													</span>
												</div>
											))}
										</div>
									)}
								</div>
							) : null}
						</CardContent>
					</Card>
				</div>
			)}

			{/* RESULTS */}
			<div className="grid gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader>
						<CardTitle>{tr(locale, "Prix client par categorie", "Client price by category")}</CardTitle>
						<CardDescription>
							{tr(
								locale,
								"Calcul reprenant la logique complete du module initial avec pre/post hotel, transferts et gestion du markup vols.",
								"Calculation based on full original logic with pre/post hotels, transfers, and flight markup handling.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{resultRows.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{tr(locale, "Entre au moins une categorie de cabine pour afficher les resultats.", "Enter at least one cabin category to display results.")}
							</p>
						) : (
							<div className="grid gap-3 md:grid-cols-2">
								{resultRows.map((row) => (
									<article
										key={row.id}
										className="rounded-2xl border border-border/70 bg-background/60 p-4"
									>
										<div className="mb-2 flex items-center justify-between">
											<h3 className="font-semibold">{row.label}</h3>
											<Badge variant="outline">{row.id}</Badge>
										</div>
										<dl className="space-y-1 text-sm">
											<StatLine
												label={tr(locale, "Prix / personne", "Price / person")}
												value={fmtCad(row.calc.prixPers)}
											/>
											<StatLine
												label={tr(locale, "Prix / pers / nuit", "Price / person / night")}
												value={fmtCad(row.calc.prixPersNuit)}
											/>
											<StatLine
												label={`${tr(locale, "Total", "Total")} (${base.pax} ${tr(locale, "pax", "pax")})`}
												value={fmtCad(row.calc.total)}
											/>
											<StatLine
												label={tr(locale, "TAAP hotel pre", "TAAP pre-stay hotel")}
												value={fmtCad(base.hotelClientChambre)}
											/>
											{base.hasPost ? (
												<StatLine
													label={tr(locale, "TAAP hotel post", "TAAP post-stay hotel")}
													value={fmtCad(base.hotelClientChambrePost)}
												/>
											) : null}
										</dl>
									</article>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{tr(locale, "Analyse marge", "Margin analysis")}</CardTitle>
						<CardDescription>
							{tr(locale, "Amelioration: vue immediate de la rentabilite par categorie.", "Improvement: immediate profitability view by category.")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Vente estimee", "Estimated sales")}</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(summary.totalVente)}</p>
						</div>
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Revenu estime", "Estimated revenue")}</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(summary.totalRevenu)}</p>
						</div>
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Sante marge", "Margin health")}</p>
							<p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">
								{summary.margeMoy.toFixed(1)}% <Badge>{summary.health}</Badge>
							</p>
						</div>
						<div className="space-y-2">
							{resultRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{tr(locale, "Les barres de marge apparaitront par categorie active.", "Margin bars will appear for each active category.")}
								</p>
							) : (
								resultRows.map((row) => {
									const height = Math.max(6, Math.min(100, row.margePct));
									return (
										<div
											key={`marge_${row.id}`}
											className="space-y-1"
										>
											<div className="flex items-center justify-between text-xs">
												<span>{row.label}</span>
												<span>{row.margePct.toFixed(1)}%</span>
											</div>
											<div className="h-2 rounded-full bg-muted">
												<div
													className={cn("h-full rounded-full", row.margePct >= 14 ? "bg-emerald-500" : row.margePct >= 8 ? "bg-amber-500" : "bg-rose-500")}
													style={{ width: `${height}%` }}
												/>
											</div>
										</div>
									);
								})
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function Field({ label, children, className = "" }) {
	return (
		<div className={cn("space-y-1.5", className)}>
			<Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}

function StatLine({ label, value }) {
	return (
		<div className="flex items-center justify-between gap-2">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="font-medium tabular-nums">{value}</dd>
		</div>
	);
}

function MoneyWithMode({ label, value, mode, onValue, onMode, className = "" }) {
	const { locale } = useLocale();
	return (
		<Field
			label={label}
			className={className}
		>
			<div className="relative w-full">
				<Input
					type="number"
					min="0"
					step="0.01"
					value={value}
					onChange={(e) => onValue(e.target.value)}
					className="w-full h-8"
				/>
				<select
					value={mode}
					onChange={(e) => onMode(e.target.value)}
					className="absolute right-0 top-0 bottom-0 flex h-8 rounded-r-lg border border-input bg-background px-2 text-sm"
				>
					<option value="pers">{tr(locale, "$/pers", "$/person")}</option>
					<option value="tot">{tr(locale, "$ total", "$ total")}</option>
				</select>
			</div>
		</Field>
	);
}

function CruiseSearchSelect({ value, onValueChange, options, placeholder, searchPlaceholder, emptyMessage, disabled = false }) {
	const { locale } = useLocale();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const selected = useMemo(() => {
		return (Array.isArray(options) ? options : []).find((option) => option.value === value) || null;
	}, [options, value]);

	const filtered = useMemo(() => {
		const list = Array.isArray(options) ? options : [];
		if (!query.trim()) return list.slice(0, 120);
		const q = query.trim().toLowerCase();
		return list.filter((option) => option.label.toLowerCase().includes(q)).slice(0, 120);
	}, [options, query]);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (!disabled) setOpen(next);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					disabled={disabled}
					className="h-8 w-full justify-between rounded-lg border-input bg-transparent px-3 py-1 text-sm font-normal"
				>
					<span className={cn("truncate text-left", !value && "text-muted-foreground")}>{selected?.label || value || placeholder}</span>
					<ChevronDown className="size-4 shrink-0 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) rounded-xl border-border/70 p-0 shadow-xl"
			>
				<div className="p-2">
					<Input
						autoFocus
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={searchPlaceholder}
						className="h-9"
					/>
				</div>
				<div className="max-h-72 overflow-y-auto p-1 pt-0">
					{value ? (
						<button
							type="button"
							onClick={() => {
								onValueChange("");
								setOpen(false);
								setQuery("");
							}}
							className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60"
						>
							{tr(locale, "Effacer la selection", "Clear selection")}
						</button>
					) : null}
					{filtered.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p> : null}
					{filtered.map((option) => {
						const isSelected = value === option.value;
						return (
							<button
								key={option.id || option.value}
								type="button"
								onClick={() => {
									onValueChange(option.value);
									setOpen(false);
									setQuery("");
								}}
								className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60", isSelected && "bg-muted/70")}
							>
								<Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
								<span className="flex-1 truncate">{option.label}</span>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function FlightSegmentsEditor({ title, direction, segments, airlineOptions, airportOptions, onAdd, onRemove, onUpdate, locale = "fr" }) {
	return (
		<div className="space-y-2 rounded-xl border border-border/70 p-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-sm font-semibold">{title}</p>
					{/* <p className="text-xs text-muted-foreground">
						{tr(
							locale,
							"Ajouter un ou plusieurs segments. Duree de vol et escales se calculent automatiquement.",
							"Add one or more segments. Flight duration and layovers are calculated automatically.",
						)}
					</p> */}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onAdd(direction)}
				>
					<Plus className="size-4" /> {tr(locale, "Segment", "Segment")}
				</Button>
			</div>

			{segments.map((segment, index) => {
				const duration = minutesDiff(segment.departTime, segment.arriveTime);
				const prev = index > 0 ? segments[index - 1] : null;
				const layover = prev ? minutesDiff(prev.arriveTime, segment.departTime) : null;

				return (
					<div
						key={`${direction}-${index}`}
						className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-3"
					>
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{tr(locale, "Segment", "Segment")} {index + 1}
							</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => onRemove(direction, index)}
								disabled={segments.length <= 1}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>

						<div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
							<Field label={tr(locale, "Compagnie aerienne", "Airline")}>
								<select
									value={segment.airline}
									onChange={(e) => onUpdate(direction, index, "airline", e.target.value)}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									<option value="">{tr(locale, "Selectionner", "Select")}</option>
									{airlineOptions.map((option) => (
										<option
											key={`airline-${option}`}
											value={option}
										>
											{option}
										</option>
									))}
								</select>
							</Field>

							<Field label={tr(locale, "Operateur", "Operator")}>
								<select
									value={segment.operator}
									onChange={(e) => onUpdate(direction, index, "operator", e.target.value)}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									<option value="">{tr(locale, "Selectionner", "Select")}</option>
									{airlineOptions.map((option) => (
										<option
											key={`operator-${option}`}
											value={option}
										>
											{option}
										</option>
									))}
								</select>
							</Field>

							<Field label={tr(locale, "Aeroport depart (IATA)", "Departure airport (IATA)")}>
								<AirportIataPicker
									value={segment.fromIata}
									onValueChange={(nextValue) => onUpdate(direction, index, "fromIata", nextValue)}
									airports={airportOptions}
									placeholder={tr(locale, "Selectionner aeroport depart", "Select departure airport")}
									locale={locale}
								/>
							</Field>

							<Field label={tr(locale, "Heure depart", "Departure time")}>
								<Input
									type="time"
									value={segment.departTime}
									onChange={(e) => onUpdate(direction, index, "departTime", e.target.value)}
								/>
							</Field>

							<Field label={tr(locale, "Heure arrivee", "Arrival time")}>
								<Input
									type="time"
									value={segment.arriveTime}
									onChange={(e) => onUpdate(direction, index, "arriveTime", e.target.value)}
								/>
							</Field>

							<Field label={tr(locale, "Aeroport arrivee (IATA)", "Arrival airport (IATA)")}>
								<AirportIataPicker
									value={segment.toIata}
									onValueChange={(nextValue) => onUpdate(direction, index, "toIata", nextValue)}
									airports={airportOptions}
									placeholder={tr(locale, "Selectionner aeroport arrivee", "Select arrival airport")}
									locale={locale}
								/>
							</Field>
						</div>

						<div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
							<div className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
								<p className="uppercase tracking-wide">{tr(locale, "Temps de vol", "Flight time")}</p>
								<p className="font-medium text-foreground">{formatDuration(duration)}</p>
							</div>
							<div className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
								<p className="uppercase tracking-wide">{tr(locale, "Escale", "Layover")}</p>
								<p className="font-medium text-foreground">{index === 0 ? "-" : formatDuration(layover)}</p>
							</div>
						</div>
					</div>
				);
			})}

			{airportOptions?.length ? null : (
				<p className="text-xs text-muted-foreground">{tr(locale, "Aucune liste d'aeroports IATA chargee.", "No IATA airport list loaded.")}</p>
			)}
		</div>
	);
}

function AirportIataPicker({ value, onValueChange, airports, placeholder, locale = "fr" }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const selected = useMemo(() => {
		const target = normalizeIata(value);
		return (Array.isArray(airports) ? airports : []).find((airport) => airport.code === target) || null;
	}, [airports, value]);

	const filtered = useMemo(() => {
		const list = Array.isArray(airports) ? airports : [];
		if (!query.trim()) return list.slice(0, 120);
		const q = query.trim().toLowerCase();
		return list
			.filter((airport) => {
				const searchable = `${airport.code} ${airport.city || ""} ${airport.name || ""} ${airport.country || ""}`.toLowerCase();
				return searchable.includes(q);
			})
			.slice(0, 120);
	}, [airports, query]);

	const label = selected ? `${selected.code} - ${selected.city || selected.name}` : normalizeIata(value);

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					className="h-8 w-full justify-between rounded-lg border-input bg-transparent px-3 py-1 text-sm font-normal"
				>
					<span className={cn("truncate text-left", !value && "text-muted-foreground")}>{value ? label : placeholder}</span>
					<ChevronDown className="size-4 shrink-0 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) rounded-xl border-border/70 p-0 shadow-xl"
			>
				<div className="p-2">
					<Input
						autoFocus
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={tr(locale, "Rechercher par IATA, ville, aeroport...", "Search by IATA, city, airport...")}
						className="h-9"
					/>
				</div>
				<div className="max-h-72 overflow-y-auto p-1 pt-0">
					{filtered.length === 0 ? <p className="p-3 text-sm text-muted-foreground">{tr(locale, "Aucun aeroport trouve.", "No airport found.")}</p> : null}
					{filtered.map((airport) => {
						const isSelected = normalizeIata(value) === airport.code;
						return (
							<button
								key={`${airport.code}-${airport.country || "XX"}`}
								type="button"
								onClick={() => {
									onValueChange(airport.code);
									setOpen(false);
									setQuery("");
								}}
								className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60", isSelected && "bg-muted/70")}
							>
								<Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
								<span className="w-12 shrink-0 font-semibold">{airport.code}</span>
								<span className="flex-1 truncate">{airport.city ? `${airport.city} - ${airport.name}` : airport.name}</span>
								<span className="shrink-0 text-xs text-muted-foreground">{airport.country || "-"}</span>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
