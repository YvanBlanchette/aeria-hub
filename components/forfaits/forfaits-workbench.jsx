"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Copy, Download, FileText, FolderOpen, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONSTANTS_KEY = "aeria.forfaits.constants.v1";

const DEFAULT_CONSTANTS = {
	admin: 150,
	pctVols: 10,
	pctMarkup: 30,
	pourboiresNuit: 25,
	arrondi: 0,
};

const TAB_ITEMS = [
	{ id: "croisiere", label: "Croisiere" },
	{ id: "vols", label: "Vols" },
	{ id: "hotel", label: "Hotel" },
	{ id: "transferts", label: "Transferts" },
	{ id: "sommaire", label: "Sommaire" },
];

const CABINS = [
	{ id: "INT", label: "Interieure" },
	{ id: "EXT", label: "Exterieure" },
	{ id: "BAL", label: "Balcon" },
	{ id: "SUI", label: "Suite" },
];

const YES_NO = [
	{ value: "false", label: "Non" },
	{ value: "true", label: "Oui" },
];

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
		commissionHotel: "",
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

export function ForfaitsWorkbench({ clients, trips, initialProjects }) {
	const [tab, setTab] = useState("croisiere");
	const [draft, setDraft] = useState(() => makeDefaultDraft());
	const [constants, setConstants] = useState(DEFAULT_CONSTANTS);
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
			const savedConstants = localStorage.getItem(CONSTANTS_KEY);
			if (savedConstants) {
				const parsed = JSON.parse(savedConstants);
				setConstants({ ...DEFAULT_CONSTANTS, ...parsed });
			}
		} catch {
			setNotice("Impossible de lire le stockage local du navigateur.");
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(CONSTANTS_KEY, JSON.stringify(constants));
		} catch {
			setNotice("Impossible de sauvegarder les constantes localement.");
		}
	}, [constants]);

	useEffect(() => {
		if (!selectedProjectId) {
			setRevisions([]);
			return;
		}
		let active = true;
		setLoadingRevisions(true);
		fetch(`/api/forfaits/${selectedProjectId}/revisions`)
			.then(async (response) => {
				if (!response.ok) throw new Error("revisions_failed");
				return response.json();
			})
			.then((data) => {
				if (!active) return;
				setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
			})
			.catch(() => {
				if (!active) return;
				setRevisions([]);
			})
			.finally(() => {
				if (!active) return;
				setLoadingRevisions(false);
			});
		return () => {
			active = false;
		};
	}, [selectedProjectId]);

	const base = useMemo(() => computeBase(draft, constants), [draft, constants]);
	const cabinRows = useMemo(() => activeCabins(draft, base), [draft, base]);

	const resultRows = useMemo(() => {
		return cabinRows.map((cab) => {
			const calc = cabinCalc(base, constants, cab.facture);
			const commCroisiere = toNumber(draft.commissions[cab.id]);
			const commHotel = toNumber(draft.commissionHotel);
			const commTransferts = toNumber(draft.commissionTransferts);
			const commVols = toNumber(draft.commissionVols);
			const markupRev = base.markup * base.pax;
			const adminRev = constants.admin * base.pax;
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
	}, [base, cabinRows, constants.admin, draft.commissionHotel, draft.commissionTransferts, draft.commissionVols, draft.commissions]);

	const summary = useMemo(() => {
		const totalVente = resultRows.reduce((sum, row) => sum + row.calc.total, 0);
		const totalRevenu = resultRows.reduce((sum, row) => sum + row.revenu, 0);
		const margeMoy = totalVente > 0 ? (totalRevenu / totalVente) * 100 : 0;
		const health = margeMoy >= 16 ? "Forte" : margeMoy >= 10 ? "Solide" : margeMoy >= 6 ? "A surveiller" : "Faible";
		return {
			totalVente,
			totalRevenu,
			margeMoy,
			health,
		};
	}, [resultRows]);

	const filteredTrips = useMemo(() => {
		if (!draft.clientId) return trips;
		return trips.filter((trip) => trip.clientId === draft.clientId);
	}, [draft.clientId, trips]);

	const selectedTrip = useMemo(() => {
		return trips.find((trip) => trip.id === draft.tripId) || null;
	}, [draft.tripId, trips]);

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

	function resetAll() {
		setDraft(makeDefaultDraft());
		setSelectedProjectId("");
		setNotice("Nouveau dossier initialise.");
	}

	function buildMutationBody(projectIdOverride) {
		return {
			id: projectIdOverride || selectedProjectId || undefined,
			name: (draft.projectName || "").trim() || "Dossier sans titre",
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
			setNotice(`Projet enregistre: ${normalized.name}`);
		} catch {
			setNotice("Enregistrement impossible. Verifie la connexion et reessaie.");
		} finally {
			setBusy(false);
		}
	}

	function loadProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;
		setDraft({ ...makeDefaultDraft(), ...(project.payload || project.draft || {}) });
		setConstants({ ...DEFAULT_CONSTANTS, ...(project.constants || {}) });
		setSelectedProjectId(project.id);
		setNotice(`Projet charge: ${project.name}`);
	}

	async function duplicateProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		setBusy(true);
		try {
			const body = {
				name: `${project.name} (copie)`,
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
			setNotice("Copie creee.");
		} catch {
			setNotice("Duplication impossible.");
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
			setNotice("Projet supprime.");
		} catch {
			setNotice("Suppression impossible.");
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
		setNotice("Export JSON telecharge.");
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
		setNotice("Export CSV telecharge.");
	}

	async function exportExcel() {
		try {
			const XLSX = await import("xlsx");
			const wb = XLSX.utils.book_new();

			const overviewRows = [
				["Projet", draft.projectName || "Sans titre"],
				["Client", clients.find((c) => c.id === draft.clientId)?.name || "-"],
				["Voyage", selectedTrip?.name || "-"],
				["Passagers", base.pax],
				["Nuits croisiere", base.nuits],
				["Nuits totales", base.totalNuits],
				["Vente estimee", summary.totalVente],
				["Revenu estime", summary.totalRevenu],
				["Marge moyenne (%)", Number(summary.margeMoy.toFixed(2))],
			];

			const pricingRows = [
				["Categorie", "Facture cabine", "Prix / personne", "Prix / pers / nuit", "Total groupe", "TAAP pre", "TAAP post", "Perte absorbee / pers"],
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
				["Categorie", "Commission croisiere", "Revenu total", "Marge (%)"],
				...resultRows.map((row) => [row.label, row.commCroisiere, row.revenu, Number(row.margePct.toFixed(2))]),
			];

			const inputsRows = flattenDraftToCsvRows(draft);

			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), "Overview");
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pricingRows), "Pricing");
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueRows), "Revenue");
			XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inputsRows), "Inputs");

			const safe = (draft.projectName || "forfait")
				.replace(/[^a-zA-Z0-9- ]/g, "")
				.trim()
				.replace(/\s+/g, "-")
				.toLowerCase();
			XLSX.writeFile(wb, `${safe || "forfait"}-interne.xlsx`);
			setNotice("Export Excel interne telecharge.");
		} catch {
			setNotice("Export Excel impossible.");
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
			setNotice("PDF client telecharge.");
		} catch {
			setNotice("Export PDF impossible.");
		}
	}

	async function convertToQuote() {
		if (!selectedProjectId) {
			setNotice("Enregistre d'abord le forfait pour le convertir en quote.");
			return;
		}
		if (!draft.tripId) {
			setNotice("Selectionne un voyage avant conversion en quote.");
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
				setNotice(data?.error || "Conversion en quote impossible.");
				return;
			}

			setNotice("Quote cree avec succes. Ouverture de l'onglet quotes du voyage.");
			if (data?.redirectTo) {
				window.location.assign(data.redirectTo);
			}
		} catch {
			setNotice("Conversion en quote impossible.");
		} finally {
			setBusy(false);
		}
	}

	async function copySummary() {
		const lines = [];
		lines.push(`Projet: ${draft.projectName || "Sans titre"}`);
		if (selectedTrip) lines.push(`Voyage: ${selectedTrip.name} (${selectedTrip.clientName})`);
		lines.push(`Passagers: ${base.pax}`);
		lines.push(`Nuits total: ${base.totalNuits}`);
		lines.push(`Vente estimee (toutes categories): ${fmtCad(summary.totalVente)}`);
		lines.push(`Revenu estime (toutes categories): ${fmtCad(summary.totalRevenu)}`);
		lines.push(`Marge moyenne: ${summary.margeMoy.toFixed(1)}% (${summary.health})`);
		lines.push("");
		resultRows.forEach((row) => {
			lines.push(`- ${row.label}: ${fmtCad(row.calc.prixPers)} / pers | ${fmtCad(row.calc.total)} total | marge ${row.margePct.toFixed(1)}%`);
		});

		try {
			await navigator.clipboard.writeText(lines.join("\n"));
			setNotice("Synthese copiee dans le presse-papiers.");
		} catch {
			setNotice("Copie impossible depuis ce navigateur.");
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
				setNotice("Fichier JSON invalide.");
				return;
			}
			setDraft({ ...makeDefaultDraft(), ...nextDraft });
			setConstants({ ...DEFAULT_CONSTANTS, ...nextConstants });
			setSelectedProjectId("");
			setNotice("JSON importe.");
		} catch {
			setNotice("Import JSON impossible.");
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
			setNotice("CSV importe.");
		} catch {
			setNotice("Import CSV impossible.");
		}
	}

	return (
		<div className="space-y-6">
			{/* HERO */}
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-3xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Forfaits engine</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Calculateur de forfaits croisiere</h1>
						<p className="text-sm leading-6 text-muted-foreground">
							Reprise complete du module aeria-outil-forfaits, integree au CRM avec liaison client/voyage, suivi de marge et sauvegarde de dossiers.
						</p>
					</div>
					<div className="grid min-w-55 grid-cols-1 gap-2 text-sm">
						<div className="rounded-xl border border-border bg-background/70 px-3 py-2">
							<p className="text-[11px] uppercase tracking-wide text-muted-foreground">Categories actives</p>
							<p className="text-lg font-semibold">{resultRows.length}</p>
						</div>
						<div className="rounded-xl border border-border bg-background/70 px-3 py-2">
							<p className="text-[11px] uppercase tracking-wide text-muted-foreground">Marge moyenne</p>
							<p className="text-lg font-semibold">{summary.margeMoy.toFixed(1)}%</p>
						</div>
					</div>
				</div>
			</div>

			{/* CRM CONTEXT */}
			<Card>
				<CardHeader>
					<CardTitle>Contexte CRM</CardTitle>
					<CardDescription>Associe ton forfait a un client et un voyage existants pour garder le suivi commercial coherent.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="projectName">Nom du dossier</Label>
						<Input
							id="projectName"
							value={draft.projectName}
							onChange={(event) => setField("projectName", event.target.value)}
							placeholder="Ex: Caraibes - Famille Tremblay"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="clientId">Client</Label>
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
							<option value="">Aucun client</option>
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
						<Label htmlFor="tripId">Voyage</Label>
						<select
							id="tripId"
							value={draft.tripId}
							onChange={(event) => setField("tripId", event.target.value)}
							className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<option value="">Aucun voyage</option>
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
						{item.label}
					</Button>
				))}
			</div>

			{/* CROISIERE TAB */}
			{tab === "croisiere" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Cadre du voyage</CardTitle>
							<CardDescription>Infos croisiere, passagers, taux de change et categories cabine.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<Field label="Compagnie">
								<Input
									value={draft.compagnie}
									onChange={(e) => setField("compagnie", e.target.value)}
								/>
							</Field>
							<Field label="Navire">
								<Input
									value={draft.navire}
									onChange={(e) => setField("navire", e.target.value)}
								/>
							</Field>
							<Field label="Port depart">
								<Input
									value={draft.portDepart}
									onChange={(e) => setField("portDepart", e.target.value)}
								/>
							</Field>
							<Field label="Port arrivee">
								<Input
									value={draft.portArrivee}
									onChange={(e) => setField("portArrivee", e.target.value)}
								/>
							</Field>
							<Field label="Date debut">
								<Input
									type="date"
									value={draft.croisiereDebut}
									onChange={(e) => setField("croisiereDebut", e.target.value)}
								/>
							</Field>
							<Field label="Date fin">
								<Input
									type="date"
									value={draft.croisiereFin}
									onChange={(e) => setField("croisiereFin", e.target.value)}
								/>
							</Field>
							<Field label="Passagers">
								<Input
									type="number"
									min="1"
									value={draft.pax}
									onChange={(e) => setField("pax", e.target.value)}
								/>
							</Field>
							<Field label="Nuits croisiere">
								<Input
									type="number"
									min="0"
									value={draft.nuits}
									onChange={(e) => setField("nuits", e.target.value)}
								/>
							</Field>
							<Field label="Pourboires inclus">
								<select
									value={String(draft.pourboiresInclus)}
									onChange={(e) => setField("pourboiresInclus", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									{YES_NO.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="Pourboires manuels (si non inclus)">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.pourboiresManuel}
									onChange={(e) => setField("pourboiresManuel", e.target.value)}
								/>
							</Field>
							<Field label="Convertir USD en CAD">
								<select
									value={String(draft.usdCab)}
									onChange={(e) => setField("usdCab", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									{YES_NO.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="Taux USD/CAD">
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

					<Card>
						<CardHeader>
							<CardTitle>Cabines et commissions croisiere</CardTitle>
							<CardDescription>Prix brut cabine et commission croisiere par categorie.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 md:grid-cols-2">
								{CABINS.map((cab) => (
									<Field
										key={cab.id}
										label={`${cab.label} - cout cabine`}
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
										label={`${cab.label} - commission`}
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
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* VOLS TAB */}
			{tab === "vols" && (
				<Card>
					<CardHeader>
						<CardTitle>Vols et bagages</CardTitle>
						<CardDescription>Prend en charge les montants par personne ou total groupe.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						<Field label="Details vols">
							<Textarea
								value={draft.volsDetails}
								onChange={(e) => setField("volsDetails", e.target.value)}
								rows={3}
							/>
						</Field>
						<MoneyWithMode
							label="Cout vols"
							value={draft.vols}
							mode={draft.volsMode}
							onValue={(v) => setField("vols", v)}
							onMode={(v) => setField("volsMode", v)}
						/>
						<MoneyWithMode
							label="Bagages aller"
							value={draft.bagAller}
							mode={draft.bagAllerMode}
							onValue={(v) => setField("bagAller", v)}
							onMode={(v) => setField("bagAllerMode", v)}
						/>
						<MoneyWithMode
							label="Bagages retour"
							value={draft.bagRetour}
							mode={draft.bagRetourMode}
							onValue={(v) => setField("bagRetour", v)}
							onMode={(v) => setField("bagRetourMode", v)}
						/>
						<Field label="Ajustement commission vols">
							<Input
								type="number"
								min="0"
								step="0.01"
								value={draft.commissionVols}
								onChange={(e) => setField("commissionVols", e.target.value)}
							/>
						</Field>
					</CardContent>
				</Card>
			)}

			{/* HOTEL TAB */}
			{tab === "hotel" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Hotel pre et post</CardTitle>
							<CardDescription>Controle des sejours et des nuits facturees.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<Field label="Sejour pre-croisiere">
								<select
									value={String(draft.hasPre)}
									onChange={(e) => setField("hasPre", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									{YES_NO.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="Nuits pre">
								<Input
									type="number"
									min="0"
									value={draft.nuitsHotel}
									onChange={(e) => setField("nuitsHotel", e.target.value)}
								/>
							</Field>
							<Field label="Cout hotel pre / nuit">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.hotelNuit}
									onChange={(e) => setField("hotelNuit", e.target.value)}
								/>
							</Field>
							<Field label="Hotel pre">
								<Input
									value={draft.hotelNom}
									onChange={(e) => setField("hotelNom", e.target.value)}
								/>
							</Field>
							<Field label="Date arrivee pre">
								<Input
									type="date"
									value={draft.hotelDebut}
									onChange={(e) => setField("hotelDebut", e.target.value)}
								/>
							</Field>
							<Field label="Date depart pre">
								<Input
									type="date"
									value={draft.hotelFin}
									onChange={(e) => setField("hotelFin", e.target.value)}
								/>
							</Field>

							<Field label="Sejour post-croisiere">
								<select
									value={String(draft.hasPost)}
									onChange={(e) => setField("hasPost", e.target.value === "true")}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									{YES_NO.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</Field>
							<Field label="Nuits post">
								<Input
									type="number"
									min="0"
									value={draft.nuitsHotelPost}
									onChange={(e) => setField("nuitsHotelPost", e.target.value)}
								/>
							</Field>
							<Field label="Cout hotel post / nuit">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.hotelNuitPost}
									onChange={(e) => setField("hotelNuitPost", e.target.value)}
								/>
							</Field>
							<Field label="Hotel post">
								<Input
									value={draft.hotelPostNom}
									onChange={(e) => setField("hotelPostNom", e.target.value)}
								/>
							</Field>
							<Field label="Date arrivee post">
								<Input
									type="date"
									value={draft.hotelPostDebut}
									onChange={(e) => setField("hotelPostDebut", e.target.value)}
								/>
							</Field>
							<Field label="Date depart post">
								<Input
									type="date"
									value={draft.hotelPostFin}
									onChange={(e) => setField("hotelPostFin", e.target.value)}
								/>
							</Field>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Constantes et commissions</CardTitle>
							<CardDescription>Parametres globaux de pricing et du revenu agence.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							<Field label="Frais admin / passager">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={constants.admin}
									onChange={(e) => setConstants((prev) => ({ ...prev, admin: toNumber(e.target.value) }))}
								/>
							</Field>
							<Field label="Frais service vols (%)">
								<Input
									type="number"
									min="0"
									step="0.1"
									value={constants.pctVols}
									onChange={(e) => setConstants((prev) => ({ ...prev, pctVols: toNumber(e.target.value) }))}
								/>
							</Field>
							<Field label="Markup hotel max (%)">
								<Input
									type="number"
									min="0"
									step="0.1"
									value={constants.pctMarkup}
									onChange={(e) => setConstants((prev) => ({ ...prev, pctMarkup: toNumber(e.target.value) }))}
								/>
							</Field>
							<Field label="Pourboires / nuit / pers">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={constants.pourboiresNuit}
									onChange={(e) => setConstants((prev) => ({ ...prev, pourboiresNuit: toNumber(e.target.value) }))}
								/>
							</Field>
							<Field label="Arrondi prix / pers">
								<select
									value={String(constants.arrondi)}
									onChange={(e) => setConstants((prev) => ({ ...prev, arrondi: toNumber(e.target.value) }))}
									className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
								>
									<option value="0">Aucun</option>
									<option value="5">Au 5 CAD</option>
									<option value="10">Au 10 CAD</option>
									<option value="25">Au 25 CAD</option>
									<option value="50">Au 50 CAD</option>
								</select>
							</Field>
							<Field label="Commission hotels (globale)">
								<Input
									type="number"
									min="0"
									step="0.01"
									value={draft.commissionHotel}
									onChange={(e) => setField("commissionHotel", e.target.value)}
								/>
							</Field>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TRANSFERTS TAB */}
			{tab === "transferts" && (
				<Card>
					<CardHeader>
						<CardTitle>Transferts</CardTitle>
						<CardDescription>Segments aeroport/hotel/port avec mode total ou par personne.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						<Field label="Transferts actives">
							<select
								value={String(draft.hasTransferts)}
								onChange={(e) => setField("hasTransferts", e.target.value === "true")}
								className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
							>
								{YES_NO.map((opt) => (
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
							label="Aeroport -> Hotel"
							value={draft.trA}
							mode={draft.trAMode}
							onValue={(v) => setField("trA", v)}
							onMode={(v) => setField("trAMode", v)}
						/>
						<MoneyWithMode
							label="Hotel -> Port"
							value={draft.trB}
							mode={draft.trBMode}
							onValue={(v) => setField("trB", v)}
							onMode={(v) => setField("trBMode", v)}
						/>
						<MoneyWithMode
							label="Port -> Aeroport"
							value={draft.trC}
							mode={draft.trCMode}
							onValue={(v) => setField("trC", v)}
							onMode={(v) => setField("trCMode", v)}
						/>
						<MoneyWithMode
							label="Port -> Hotel post"
							value={draft.trD}
							mode={draft.trDMode}
							onValue={(v) => setField("trD", v)}
							onMode={(v) => setField("trDMode", v)}
						/>
						<MoneyWithMode
							label="Hotel post -> Aeroport"
							value={draft.trE}
							mode={draft.trEMode}
							onValue={(v) => setField("trE", v)}
							onMode={(v) => setField("trEMode", v)}
						/>
						<Field label="Compagnie A->H">
							<Input
								value={draft.trAComp}
								onChange={(e) => setField("trAComp", e.target.value)}
							/>
						</Field>
						<Field label="Compagnie H->P">
							<Input
								value={draft.trBComp}
								onChange={(e) => setField("trBComp", e.target.value)}
							/>
						</Field>
						<Field label="Compagnie P->A">
							<Input
								value={draft.trCComp}
								onChange={(e) => setField("trCComp", e.target.value)}
							/>
						</Field>
						<Field label="Commission transferts">
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
			)}

			{/* SOMMAIRE TAB */}
			{tab === "sommaire" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Dossier et export</CardTitle>
							<CardDescription>Enregistre, duplique, importe et exporte ton dossier de forfait.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid gap-3 md:grid-cols-2">
								<Field label="Depot / personne">
									<Input
										type="number"
										min="0"
										step="0.01"
										value={draft.depot}
										onChange={(e) => setField("depot", e.target.value)}
									/>
								</Field>
								<Field label="Date limite depot">
									<Input
										type="date"
										value={draft.depotDate}
										onChange={(e) => setField("depotDate", e.target.value)}
									/>
								</Field>
								<Field label="Date limite solde">
									<Input
										type="date"
										value={draft.soldeDate}
										onChange={(e) => setField("soldeDate", e.target.value)}
									/>
								</Field>
							</div>
							<Field label="Notes internes">
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
									<Save /> Enregistrer
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={resetAll}
									disabled={busy}
								>
									<Calculator /> Nouveau
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportPdf}
								>
									<FileText /> Export PDF client
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={convertToQuote}
									disabled={busy || !selectedProjectId || !draft.tripId}
								>
									<FileText /> Convertir en Quote
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportExcel}
								>
									<Download /> Export Excel interne
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportJson}
								>
									<Download /> Export JSON
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={exportCsv}
								>
									<Download /> Export CSV
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => importJsonRef.current?.click()}
								>
									<Upload /> Import JSON
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => importCsvRef.current?.click()}
								>
									<Upload /> Import CSV
								</Button>
								<Button
									type="button"
									variant="secondary"
									onClick={copySummary}
								>
									<Copy /> Copier synthese
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
							<CardTitle>Projets enregistres</CardTitle>
							<CardDescription>Persistance Prisma reliee au CRM et partageable sur le VPS.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{projects.length === 0 ? (
								<p className="text-sm text-muted-foreground">Aucun projet enregistre pour le moment.</p>
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
												Maj: {new Date(project.updatedAt).toLocaleString("fr-CA")} · Rev {project.currentRevision || 1}
												{typeof project.revisionCount === "number" ? ` (${project.revisionCount})` : ""}
											</p>
										</div>
										<div className="flex items-center gap-1">
											<Button
												type="button"
												size="icon-sm"
												variant="ghost"
												onClick={() => loadProject(project.id)}
												title="Charger"
												disabled={busy}
											>
												<FolderOpen />
											</Button>
											<Button
												type="button"
												size="icon-sm"
												variant="ghost"
												onClick={() => duplicateProject(project.id)}
												title="Dupliquer"
												disabled={busy}
											>
												<Copy />
											</Button>
											<Button
												type="button"
												size="icon-sm"
												variant="destructive"
												onClick={() => deleteProject(project.id)}
												title="Supprimer"
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
									<p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Historique des revisions</p>
									{loadingRevisions ? (
										<p className="text-xs text-muted-foreground">Chargement...</p>
									) : revisions.length === 0 ? (
										<p className="text-xs text-muted-foreground">Aucune revision disponible.</p>
									) : (
										<div className="space-y-1">
											{revisions.map((rev) => (
												<div
													key={rev.id}
													className="flex items-center justify-between rounded-lg border border-border/50 bg-background/70 px-2 py-1"
												>
													<span className="text-xs font-medium">Revision {rev.revisionNumber}</span>
													<span className="text-[11px] text-muted-foreground">{new Date(rev.createdAt).toLocaleString("fr-CA")}</span>
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
						<CardTitle>Prix client par categorie</CardTitle>
						<CardDescription>Calcul reprenant la logique complete du module initial avec pre/post hotel, transferts et gestion du markup vols.</CardDescription>
					</CardHeader>
					<CardContent>
						{resultRows.length === 0 ? (
							<p className="text-sm text-muted-foreground">Entre au moins une categorie de cabine pour afficher les resultats.</p>
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
												label="Prix / personne"
												value={fmtCad(row.calc.prixPers)}
											/>
											<StatLine
												label="Prix / pers / nuit"
												value={fmtCad(row.calc.prixPersNuit)}
											/>
											<StatLine
												label={`Total (${base.pax} pax)`}
												value={fmtCad(row.calc.total)}
											/>
											<StatLine
												label="TAAP hotel pre"
												value={fmtCad(base.hotelClientChambre)}
											/>
											{base.hasPost ? (
												<StatLine
													label="TAAP hotel post"
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
						<CardTitle>Analyse marge</CardTitle>
						<CardDescription>Amelioration: vue immediate de la rentabilite par categorie.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Vente estimee</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(summary.totalVente)}</p>
						</div>
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Revenu estime</p>
							<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(summary.totalRevenu)}</p>
						</div>
						<div className="rounded-xl border border-border p-3">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">Sante marge</p>
							<p className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">
								{summary.margeMoy.toFixed(1)}% <Badge>{summary.health}</Badge>
							</p>
						</div>
						<div className="space-y-2">
							{resultRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">Les barres de marge apparaitront par categorie active.</p>
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

function Field({ label, children }) {
	return (
		<div className="space-y-1.5">
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

function MoneyWithMode({ label, value, mode, onValue, onMode }) {
	return (
		<Field label={label}>
			<div className="grid grid-cols-[1fr_auto] gap-2">
				<Input
					type="number"
					min="0"
					step="0.01"
					value={value}
					onChange={(e) => onValue(e.target.value)}
				/>
				<select
					value={mode}
					onChange={(e) => onMode(e.target.value)}
					className="flex h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
				>
					<option value="pers">$/pers</option>
					<option value="tot">$ total</option>
				</select>
			</div>
		</Field>
	);
}
