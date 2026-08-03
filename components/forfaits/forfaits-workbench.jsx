"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Check, ChevronDown, ChevronUp, Copy, Download, FileText, FolderOpen, Menu, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
	CONSTANTS_KEY,
	DEFAULT_CONSTANTS,
	TAB_ITEMS,
	CABINS,
	NOTICE_TIMEOUT_MS,
	tr,
	matchesCruiseLineShip,
	createFlightSegment,
	normalizeFlightSegments,
	normalizeIata,
	addDays,
	diffDays,
	normalizeCruisePortItems,
	parseCruisePortPaste,
	makeDefaultDraft,
	toNumber,
	fmtCad,
	computeBase,
	activeCabins,
	cabinCalc,
	flattenDraftToCsvRows,
	asCsvCell,
	parseCsvRows,
	setByPath,
	normalizeConstantsInput,
	normalizeDraftInput,
	readResponseJson,
	getResponseErrorMessage,
} from "@/components/forfaits/forfaits-workbench-utils";

export function ForfaitsWorkbench({
	clients,
	trips,
	initialProjects,
	initialProjectId = "",
	initialClientId = "",
	initialTripId = "",
	airlineSuppliers = [],
	iataAirports = [],
	iataAirlines = [],
	cruiseLineOptions = [],
	cruiseShipOptions = [],
	cruisePortOptions = [],
}) {
	const { locale } = useLocale();
	const tabMeta = useMemo(
		() => ({
			croisiere: { title: tr(locale, "Croisiere", "Cruise"), hint: tr(locale, "Cadre", "Setup") },
			vols: { title: tr(locale, "Vols", "Flights"), hint: tr(locale, "Segments", "Segments") },
			hotel: { title: tr(locale, "Hotels & Transferts", "Hotels & Transfers"), hint: tr(locale, "Sejours", "Stays") },
			sommaire: { title: tr(locale, "Sommaire", "Summary"), hint: tr(locale, "Marge", "Margin") },
			projets: { title: tr(locale, "Projets", "Projects"), hint: tr(locale, "Sauvegarde", "Storage") },
			parametres: { title: tr(locale, "Parametres", "Parameters"), hint: tr(locale, "Reglages", "Settings") },
		}),
		[locale],
	);
	const yesNoOptions = useMemo(
		() => [
			{ value: "false", label: tr(locale, "Non", "No") },
			{ value: "true", label: tr(locale, "Oui", "Yes") },
		],
		[locale],
	);
	const initialProject = useMemo(
		() => (initialProjectId && Array.isArray(initialProjects) ? initialProjects.find((project) => project.id === initialProjectId) : null) || null,
		[initialProjectId, initialProjects],
	);
	const [draft, setDraft] = useState(() => {
		const fromProject = normalizeDraftInput(initialProject?.payload || initialProject?.draft, cruisePortOptions);
		const seeded = normalizeDraftInput(fromProject, cruisePortOptions);
		return {
			...seeded,
			clientId: initialClientId || seeded.clientId,
			tripId: initialTripId || seeded.tripId,
		};
	});
	const [hotelPre, setHotelPre] = useState(() => Boolean(draft.hasPre));
	const [hotelPost, setHotelPost] = useState(() => Boolean(draft.hasPost));
	const [tab, setTab] = useState("croisiere");
	const [constants, setConstants] = useState(() => {
		if (initialProject?.constants) {
			return normalizeConstantsInput(initialProject.constants);
		}
		if (typeof window === "undefined") return DEFAULT_CONSTANTS;
		try {
			const savedConstants = window.localStorage.getItem(CONSTANTS_KEY);
			if (!savedConstants) return DEFAULT_CONSTANTS;
			const parsed = JSON.parse(savedConstants);
			return normalizeConstantsInput(parsed);
		} catch {
			return DEFAULT_CONSTANTS;
		}
	});
	const [projects, setProjects] = useState(() =>
		Array.isArray(initialProjects)
			? initialProjects.map((project) => ({
					...project,
					draft: normalizeDraftInput(project.payload || project.draft, cruisePortOptions),
				}))
			: [],
	);
	const [selectedProjectId, setSelectedProjectId] = useState(() => initialProject?.id || "");
	const [notice, setNotice] = useState("");
	const [busy, setBusy] = useState(false);
	const [revisions, setRevisions] = useState([]);
	const [loadingRevisions, setLoadingRevisions] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewAction, setPreviewAction] = useState(null);
	const [previewPlan, setPreviewPlan] = useState(null);
	const [importOptions, setImportOptions] = useState({
		includeCruise: true,
		includeFlights: true,
		includeHotels: true,
		includeTransfers: true,
		importIntoExistingTrip: false,
	});
	const [routePaste, setRoutePaste] = useState("");
	const [pendingCruisePort, setPendingCruisePort] = useState("");
	const importJsonRef = useRef(null);
	const importCsvRef = useRef(null);

	const actionLabel = useMemo(
		() => ({
			trip: tr(locale, "Convertir en voyage", "Convert to trip"),
			quote: tr(locale, "Convertir en devis", "Convert to quote"),
		}),
		[locale],
	);

	useEffect(() => {
		try {
			localStorage.setItem(CONSTANTS_KEY, JSON.stringify(constants));
		} catch {
			console.warn("Impossible de sauvegarder les constantes localement.");
		}
	}, [constants]);

	useEffect(() => {
		if (!notice) return;
		const timer = window.setTimeout(() => setNotice(""), NOTICE_TIMEOUT_MS);
		return () => window.clearTimeout(timer);
	}, [notice]);

	const base = useMemo(() => computeBase(draft, constants), [draft, constants]);
	const cabinRows = useMemo(() => activeCabins(draft, base), [draft, base]);
	const { admin } = constants;

	const resultRows = useMemo(() => {
		return cabinRows.map((cab) => {
			const calc = cabinCalc(base, constants, cab.facture);
			const commCroisiere = toNumber(draft.commissions[cab.id]);
			const commHotelPre = toNumber(draft.commissionHotelPre);
			const commHotelPost = toNumber(draft.commissionHotelPost);
			const commHotel = commHotelPre + commHotelPost;
			const commTransferts = toNumber(draft.commissionTransferts);
			const commVols = toNumber(draft.commissionVols);
			const markupRev = base.markup * base.pax;
			const adminRev = admin * base.pax;
			const coussinRev = calc.coussin * base.pax;
			const revenu = commCroisiere + commHotel + commTransferts + commVols + markupRev + adminRev + coussinRev;
			const margePct = calc.total > 0 ? (revenu / calc.total) * 100 : 0;
			const priceRows = [
				{
					label: tr(locale, `${cab.label} (${fmtCad(cab.facture)} ÷ ${base.pax})`, `${cab.label} (${fmtCad(cab.facture)} ÷ ${base.pax})`),
					value: calc.cabinePers,
				},
				{ label: tr(locale, "Vols", "Flights"), value: base.vols },
				{
					label: tr(
						locale,
						`Bagages (${fmtCad(base.bagAller)} aller + ${fmtCad(base.bagRetour)} retour)`,
						`Baggage (${fmtCad(base.bagAller)} outbound + ${fmtCad(base.bagRetour)} return)`,
					),
					value: base.bagages,
				},
				{
					label: tr(
						locale,
						`Hotel pre (${fmtCad(toNumber(draft.hotelNuit))} × ${base.nuitsHotel} × ${base.pax})`,
						`Pre-stay hotel (${fmtCad(toNumber(draft.hotelNuit))} × ${base.nuitsHotel} × ${base.pax})`,
					),
					value: base.hasPre ? base.hotelChambre / base.pax : 0,
				},
				{
					label: tr(
						locale,
						`Hotel post (${fmtCad(toNumber(draft.hotelNuitPost))} × ${base.nuitsHotelPost} × ${base.pax})`,
						`Post-stay hotel (${fmtCad(toNumber(draft.hotelNuitPost))} × ${base.nuitsHotelPost} × ${base.pax})`,
					),
					value: base.hasPost ? base.hotelChambrePost / base.pax : 0,
				},
				{ label: tr(locale, `Transferts (${base.nbTransferts} segments)`, `Transfers (${base.nbTransferts} segments)`), value: base.transferts },
				{
					label: tr(
						locale,
						base.pourboiresMode === "inclus" ? "Pourboires inclus" : base.pourboiresMode === "manuel" ? "Pourboires manuels" : "Pourboires auto",
						base.pourboiresMode === "inclus" ? "Gratuities included" : base.pourboiresMode === "manuel" ? "Manual gratuities" : "Auto gratuities",
					),
					value: base.pourboires,
				},
				{ label: tr(locale, "Frais administratifs", "Administrative fees"), value: admin * base.pax },
				{ label: tr(locale, "Markup hotel applique", "Applied hotel markup"), value: base.markup * base.pax },
			];
			const commissionRows = [
				{ label: tr(locale, "Commission croisiere", "Cruise commission"), value: commCroisiere },
				{ label: tr(locale, "Commission hotel pre", "Pre-stay hotel commission"), value: commHotelPre },
				{ label: tr(locale, "Commission hotel post", "Post-stay hotel commission"), value: commHotelPost },
				{ label: tr(locale, "Commission transferts", "Transfer commission"), value: commTransferts },
				{ label: tr(locale, "Commission vols", "Flight commission"), value: commVols },
				{
					label: tr(locale, `Frais de service vols vises (${constants.pctVols}%)`, `Target flight service fee (${constants.pctVols}%)`),
					value: base.fraisVises,
				},
				{ label: tr(locale, `Markup hotel maximal (${constants.pctMarkup}%)`, `Max hotel markup (${constants.pctMarkup}%)`), value: base.markupMax },
				{ label: tr(locale, "Markup hotel applique", "Applied hotel markup"), value: base.markup },
				{ label: tr(locale, "Perte absorbee", "Absorbed loss"), value: base.perte },
				{ label: tr(locale, "Revenu agence total", "Total agency revenue"), value: revenu },
			];

			return {
				...cab,
				calc,
				revenu,
				margePct,
				commCroisiere,
				commHotelPre,
				commHotelPost,
				commHotel,
				commTransferts,
				commVols,
				priceRows,
				commissionRows,
			};
		});
	}, [
		admin,
		base,
		cabinRows,
		constants,
		locale,
		draft.commissionHotelPost,
		draft.commissionHotelPre,
		draft.commissionTransferts,
		draft.commissionVols,
		draft.commissions,
		draft.hotelNuit,
		draft.hotelNuitPost,
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

	const clientSelectOptions = useMemo(() => clients.map((client) => ({ value: client.id, label: client.name })), [clients]);

	const tripSelectOptions = useMemo(() => filteredTrips.map((trip) => ({ value: trip.id, label: `${trip.name} - ${trip.clientName}` })), [filteredTrips]);

	const selectedTrip = useMemo(() => {
		return trips.find((trip) => trip.id === draft.tripId) || null;
	}, [draft.tripId, trips]);

	const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);

	const airlineOptions = useMemo(() => {
		const fromSuppliers = Array.isArray(airlineSuppliers) ? airlineSuppliers.map((row) => row?.name).filter(Boolean) : [];
		const merged = [...fromSuppliers, ...(Array.isArray(iataAirlines) ? iataAirlines : [])];
		return Array.from(new Set(merged.map((name) => String(name).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
	}, [airlineSuppliers, iataAirlines]);

	const airlineSelectOptions = useMemo(() => airlineOptions.map((option) => ({ value: option, label: option })), [airlineOptions]);

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

	const cruisePortStops = useMemo(
		() => normalizeCruisePortItems(draft.cruisePortStops, normalizedCruisePortOptions),
		[draft.cruisePortStops, normalizedCruisePortOptions],
	);

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

	const volsAllerSegments = useMemo(() => normalizeFlightSegments(draft.volsAllerSegments, "aller"), [draft.volsAllerSegments]);
	const volsRetourSegments = useMemo(() => normalizeFlightSegments(draft.volsRetourSegments, "retour"), [draft.volsRetourSegments]);

	const headerStats = useMemo(
		() => [
			{ label: tr(locale, "Passagers", "Passengers"), value: String(base.pax) },
			{ label: tr(locale, "Vente estimee", "Estimated sales"), value: fmtCad(summary.totalVente) },
			{ label: tr(locale, "Revenu estime", "Estimated revenue"), value: fmtCad(summary.totalRevenu) },
			{ label: tr(locale, "Marge moyenne", "Average margin"), value: `${summary.margeMoy.toFixed(1)}%` },
		],
		[base.pax, locale, summary.margeMoy, summary.totalRevenu, summary.totalVente],
	);

	function setField(field, value) {
		setDraft((prev) => ({ ...prev, [field]: value }));
	}

	function setCruisePortStops(updater) {
		setDraft((prev) => {
			const currentStops = normalizeCruisePortItems(prev.cruisePortStops, normalizedCruisePortOptions);
			const nextRaw = typeof updater === "function" ? updater(currentStops) : updater;
			return {
				...prev,
				cruisePortStops: normalizeCruisePortItems(nextRaw, normalizedCruisePortOptions),
			};
		});
	}

	function addCruisePortStop(portValue) {
		const selected = normalizedCruisePortOptions.find((option) => option.value === portValue);
		if (!selected) return;
		setCruisePortStops((currentStops) => [...currentStops, selected]);
	}

	function moveCruisePortStop(index, direction) {
		setCruisePortStops((currentStops) => {
			const next = [...currentStops];
			const swapIndex = direction === "up" ? index - 1 : index + 1;
			if (swapIndex < 0 || swapIndex >= next.length) return next;
			[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
			return next;
		});
	}

	function removeCruisePortStop(index) {
		setCruisePortStops((currentStops) => currentStops.filter((_, i) => i !== index));
	}

	function importCruisePortPaste() {
		const parsed = parseCruisePortPaste(routePaste, normalizedCruisePortOptions);
		if (parsed.length === 0) return;

		const [departure, ...rest] = parsed;
		const arrival = rest.length > 0 ? rest[rest.length - 1] : departure;
		const middleStops = rest.length > 1 ? rest.slice(0, -1) : [];

		setDraft((prev) => ({
			...prev,
			portDepart: departure.value,
			portArrivee: arrival.value,
			cruisePortStops: middleStops,
		}));
		setRoutePaste("");
		setNotice(tr(locale, "Itineraire ports importe.", "Cruise port itinerary imported."));
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
			const current = normalizeFlightSegments(prev[key], direction);
			const nextRaw = typeof updater === "function" ? updater(current) : updater;
			return {
				...prev,
				[key]: normalizeFlightSegments(nextRaw, direction),
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
		setFlightSegments(direction, (segments) => [...segments, createFlightSegment(direction)]);
	}

	function removeFlightSegment(direction, index) {
		setFlightSegments(direction, (segments) => {
			if (segments.length <= 1) return [createFlightSegment(direction)];
			return segments.filter((_, i) => i !== index);
		});
	}

	function updateHotelStay(stayType, field, value) {
		setDraft((prev) => {
			if (stayType === "pre") {
				if (field === "checkin") {
					return { ...prev, hotelDebut: value, hotelFin: addDays(value, prev.nuitsHotel) };
				}
				if (field === "checkout") {
					const nextNights = diffDays(prev.hotelDebut, value);
					return { ...prev, hotelFin: value, nuitsHotel: nextNights === "" ? prev.nuitsHotel : nextNights };
				}
				if (field === "nights") {
					return { ...prev, nuitsHotel: value, hotelFin: addDays(prev.hotelDebut, value) };
				}
			}

			if (field === "checkin") {
				return { ...prev, hotelPostDebut: value, hotelPostFin: addDays(value, prev.nuitsHotelPost) };
			}
			if (field === "checkout") {
				const nextNights = diffDays(prev.hotelPostDebut, value);
				return { ...prev, hotelPostFin: value, nuitsHotelPost: nextNights === "" ? prev.nuitsHotelPost : nextNights };
			}
			if (field === "nights") {
				return { ...prev, nuitsHotelPost: value, hotelPostFin: addDays(prev.hotelPostDebut, value) };
			}

			return prev;
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
			const data = await readResponseJson(response);
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
		const nextDraft = normalizeDraftInput(makeDefaultDraft(), normalizedCruisePortOptions);
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
			const data = await readResponseJson(response);
			if (!response.ok) {
				throw new Error(getResponseErrorMessage(data, tr(locale, "Enregistrement impossible.", "Could not save.")));
			}
			const project = data.project;
			const normalized = {
				...project,
				draft: normalizeDraftInput(project.payload, normalizedCruisePortOptions),
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
		} catch (error) {
			setNotice(
				error instanceof Error
					? error.message
					: tr(locale, "Enregistrement impossible. Verifie la connexion et reessaie.", "Could not save. Check your connection and try again."),
			);
		} finally {
			setBusy(false);
		}
	}

	function loadProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;
		const nextDraft = normalizeDraftInput(project.payload || project.draft, normalizedCruisePortOptions);
		setDraft(nextDraft);
		setHotelPre(Boolean(nextDraft.hasPre));
		setHotelPost(Boolean(nextDraft.hasPost));
		setConstants(normalizeConstantsInput(project.constants));
		setSelectedProjectId(project.id);
		refreshRevisions(project.id);
		setNotice(`${tr(locale, "Projet charge", "Project loaded")}: ${project.name}`);
	}

	async function duplicateProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;

		setBusy(true);
		try {
			const draftPayload = normalizeDraftInput(project.payload || project.draft || makeDefaultDraft(), normalizedCruisePortOptions);
			const projectConstants = normalizeConstantsInput(project.constants || DEFAULT_CONSTANTS);
			const body = {
				name: `${project.name} (${tr(locale, "copie", "copy")})`,
				clientId: project.clientId || null,
				tripId: project.tripId || null,
				payload: draftPayload,
				constants: projectConstants,
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
			const data = await readResponseJson(response);
			if (!response.ok) {
				throw new Error(getResponseErrorMessage(data, tr(locale, "Duplication impossible.", "Could not duplicate project.")));
			}
			const duplicated = {
				...data.project,
				draft: normalizeDraftInput(data.project.payload, normalizedCruisePortOptions),
			};
			setProjects((prev) => [duplicated, ...prev]);
			setNotice(tr(locale, "Copie creee.", "Copy created."));
		} catch (error) {
			setNotice(error instanceof Error ? error.message : tr(locale, "Duplication impossible.", "Could not duplicate project."));
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
		if (!draft.clientId) {
			setNotice(tr(locale, "Selectionne un client avant conversion en devis.", "Select a client before converting to a quote."));
			return;
		}

		setBusy(true);
		try {
			const response = await fetch(`/api/forfaits/${selectedProjectId}/convert-to-quote`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ importOptions }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setNotice(data?.error || tr(locale, "Conversion en devis impossible.", "Could not convert to quote."));
				return;
			}

			if (data?.tripId && !draft.tripId) {
				setField("tripId", data.tripId);
				setProjects((prev) =>
					prev.map((project) =>
						project.id === selectedProjectId
							? {
									...project,
									tripId: data.tripId,
									payload: { ...(project.payload || project.draft || {}), tripId: data.tripId },
									draft: { ...(project.draft || project.payload || {}), tripId: data.tripId },
								}
							: project,
					),
				);
			}

			setNotice(
				data?.tripCreated
					? tr(
							locale,
							`Voyage client cree automatiquement (${data.importedSegments || 0} segment(s) importe(s)) puis devis genere. Ouverture de l'onglet devis.`,
							`Client trip created automatically (${data.importedSegments || 0} imported segment(s)) and quote generated. Opening the quote tab.`,
						)
					: tr(
							locale,
							`Devis cree avec succes. ${data.importedSegments || 0} segment(s) ajoute(s), ${data.skippedSegments || 0} ignore(s). Ouverture de l'onglet devis du voyage.`,
							`Quote created successfully. ${data.importedSegments || 0} segment(s) added, ${data.skippedSegments || 0} skipped. Opening the trip quotes tab.`,
						),
			);
			if (data?.redirectTo) {
				window.location.assign(data.redirectTo);
			}
		} catch {
			setNotice(tr(locale, "Conversion en devis impossible.", "Could not convert to quote."));
		} finally {
			setBusy(false);
		}
	}

	async function convertToTrip() {
		if (!selectedProjectId) {
			setNotice(tr(locale, "Enregistre d'abord le forfait pour le convertir en voyage.", "Save the package before converting it to a trip."));
			return;
		}
		if (!draft.clientId) {
			setNotice(tr(locale, "Selectionne un client avant conversion en voyage.", "Select a client before converting to a trip."));
			return;
		}

		setBusy(true);
		try {
			const response = await fetch(`/api/forfaits/${selectedProjectId}/convert-to-trip`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ importOptions }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setNotice(data?.error || tr(locale, "Conversion en voyage impossible.", "Could not convert to trip."));
				return;
			}

			if (data?.tripId && !draft.tripId) {
				setField("tripId", data.tripId);
				setProjects((prev) =>
					prev.map((project) =>
						project.id === selectedProjectId
							? {
									...project,
									tripId: data.tripId,
									payload: { ...(project.payload || project.draft || {}), tripId: data.tripId },
									draft: { ...(project.draft || project.payload || {}), tripId: data.tripId },
								}
							: project,
					),
				);
			}

			setNotice(
				data?.tripCreated
					? tr(
							locale,
							`Voyage client cree avec ${data.importedSegments || 0} segment(s) importe(s). Ouverture du voyage.`,
							`Client trip created with ${data.importedSegments || 0} imported segment(s). Opening trip.`,
						)
					: tr(
							locale,
							`Voyage lie au forfait. ${data.importedSegments || 0} segment(s) ajoute(s), ${data.skippedSegments || 0} ignore(s). Ouverture du voyage.`,
							`Trip linked to package. ${data.importedSegments || 0} segment(s) added, ${data.skippedSegments || 0} skipped. Opening trip.`,
						),
			);

			if (data?.redirectTo) {
				window.location.assign(data.redirectTo);
			}
		} catch {
			setNotice(tr(locale, "Conversion en voyage impossible.", "Could not convert to trip."));
		} finally {
			setBusy(false);
		}
	}

	async function openConversionPreview(actionType) {
		if (!selectedProjectId) {
			setNotice(
				actionType === "quote"
					? tr(locale, "Enregistre d'abord le forfait pour le convertir en devis.", "Save the package before converting it to a quote.")
					: tr(locale, "Enregistre d'abord le forfait pour le convertir en voyage.", "Save the package before converting it to a trip."),
			);
			return;
		}
		if (!draft.clientId) {
			setNotice(
				actionType === "quote"
					? tr(locale, "Selectionne un client avant conversion en devis.", "Select a client before converting to a quote.")
					: tr(locale, "Selectionne un client avant conversion en voyage.", "Select a client before converting to a trip."),
			);
			return;
		}

		setPreviewLoading(true);
		setPreviewAction(actionType);
		setPreviewOpen(true);
		try {
			const response = await fetch(`/api/forfaits/${selectedProjectId}/preview-trip-segments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ importOptions }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setPreviewOpen(false);
				setNotice(data?.error || tr(locale, "Apercu impossible.", "Could not build preview."));
				return;
			}
			setPreviewPlan(data);
		} catch {
			setPreviewOpen(false);
			setNotice(tr(locale, "Apercu impossible.", "Could not build preview."));
		} finally {
			setPreviewLoading(false);
		}
	}

	async function confirmConversionFromPreview() {
		const selectedAction = previewAction;
		setPreviewOpen(false);
		setPreviewPlan(null);
		if (selectedAction === "quote") {
			await convertToQuote();
			return;
		}
		await convertToTrip();
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
			const normalizedDraft = normalizeDraftInput(nextDraft, normalizedCruisePortOptions);
			setDraft(normalizedDraft);
			setHotelPre(Boolean(normalizedDraft.hasPre));
			setHotelPost(Boolean(normalizedDraft.hasPost));
			setConstants(normalizeConstantsInput(nextConstants));
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
			const normalizedDraft = normalizeDraftInput(seed, normalizedCruisePortOptions);
			setDraft(normalizedDraft);
			setHotelPre(Boolean(normalizedDraft.hasPre));
			setHotelPost(Boolean(normalizedDraft.hasPost));
			setSelectedProjectId("");
			setNotice(tr(locale, "CSV importe.", "CSV imported."));
		} catch {
			setNotice(tr(locale, "Import CSV impossible.", "Could not import CSV."));
		}
	}

	return (
		<div className="space-y-6">
			{/* WORKBENCH HERO */}
			<Card>
				<CardHeader className="relative overflow-hidden rounded-t-xl border-b border-border/50 bg-linear-to-br from-primary/10 via-background to-accent/25">
					<div className="pointer-events-none absolute right-0 top-0 h-28 w-28 -translate-y-5 translate-x-4 rounded-full bg-primary/15 blur-3xl" />
					<div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 -translate-x-4 translate-y-4 rounded-full bg-accent/45 blur-2xl" />
					<div className="relative flex flex-wrap items-start justify-between gap-3">
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
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary">
									{tr(locale, "Etat", "Status")} {summary.health}
								</Badge>
								{selectedProject ? (
									<Badge variant="outline">
										{tr(locale, "Revision", "Revision")} {selectedProject.currentRevision || 1}
									</Badge>
								) : null}
								{selectedTrip ? <Badge variant="outline">{selectedTrip.name}</Badge> : null}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="default"
								onClick={saveProject}
								disabled={busy}
							>
								<Save className="size-4" /> {tr(locale, "Enregistrer", "Save")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={exportPdf}
							>
								<FileText className="size-4" /> {tr(locale, "PDF client", "Client PDF")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={resetAll}
								disabled={busy}
							>
								<Calculator className="size-4" /> {tr(locale, "Nouveau", "New")}
							</Button>
						</div>
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
						<SmartSelect
							id="clientId"
							value={draft.clientId}
							onValueChange={(clientId) => {
								setDraft((prev) => ({
									...prev,
									clientId,
									tripId: prev.tripId && trips.some((trip) => trip.id === prev.tripId && trip.clientId === clientId) ? prev.tripId : "",
								}));
							}}
							options={clientSelectOptions}
							placeholder={tr(locale, "Aucun client", "No client")}
							searchPlaceholder={tr(locale, "Rechercher client...", "Search client...")}
							emptyMessage={tr(locale, "Aucun client trouve.", "No client found.")}
							locale={locale}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="tripId">{tr(locale, "Voyage", "Trip")}</Label>
						<SmartSelect
							id="tripId"
							value={draft.tripId}
							onValueChange={(value) => setField("tripId", value)}
							options={tripSelectOptions}
							placeholder={tr(locale, "Aucun voyage", "No trip")}
							searchPlaceholder={tr(locale, "Rechercher voyage...", "Search trip...")}
							emptyMessage={tr(locale, "Aucun voyage trouve.", "No trip found.")}
							locale={locale}
						/>
					</div>
					<div className="md:col-span-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{headerStats.map((item) => (
							<div
								key={item.label}
								className="rounded-xl border border-border/70 bg-card/70 px-3 py-2"
							>
								<p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
								<p className="text-base font-semibold tabular-nums">{item.value}</p>
							</div>
						))}
					</div>
					{notice ? <p className="md:col-span-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{notice}</p> : null}
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
						className="h-auto min-h-9 rounded-xl px-3 py-1.5"
						onClick={() => setTab(item.id)}
					>
						<span className="flex flex-col items-start leading-tight">
							<span>{tabMeta[item.id]?.title || item.id}</span>
							<span className={cn("text-[10px] uppercase tracking-wide", tab === item.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
								{tabMeta[item.id]?.hint || ""}
							</span>
						</span>
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
							<div className="md:col-span-2 space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold">{tr(locale, "Itineraire ports", "Port itinerary")}</p>
										<p className="text-xs text-muted-foreground">
											{tr(
												locale,
												"Ajoute des ports un par un, ou colle l'itineraire de ton fournisseur pour le construire automatiquement.",
												"Add ports one by one, or paste your provider route to build it automatically.",
											)}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											if (!pendingCruisePort) return;
											addCruisePortStop(pendingCruisePort);
											setPendingCruisePort("");
										}}
										disabled={!pendingCruisePort}
									>
										<Plus className="mr-2 size-4" /> {tr(locale, "Ajouter port", "Add port")}
									</Button>
								</div>

								<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
									<CruiseSearchSelect
										value={pendingCruisePort}
										onValueChange={setPendingCruisePort}
										options={normalizedCruisePortOptions}
										placeholder={tr(locale, "Rechercher un port...", "Search a port...")}
										searchPlaceholder={tr(locale, "Rechercher port de l'itineraire...", "Search itinerary port...")}
										emptyMessage={tr(locale, "Aucun port trouve.", "No port found.")}
									/>
									<Button
										type="button"
										variant="secondary"
										onClick={() => {
											if (!routePaste.trim()) return;
											importCruisePortPaste();
										}}
										disabled={!routePaste.trim()}
									>
										{tr(locale, "Parser le texte", "Parse text")}
									</Button>
								</div>

								<div className="space-y-2">
									<Label className="text-xs uppercase tracking-wide text-muted-foreground">
										{tr(locale, "Coller l'itineraire fournisseur", "Paste provider itinerary")}
									</Label>
									<Textarea
										rows={3}
										value={routePaste}
										onChange={(e) => setRoutePaste(e.target.value)}
										placeholder="Ports of Call Los Angeles, California | Cabo San Lucas, Mexico | Mazatlan, Mexico | Puerto Vallarta, Mexico"
									/>
									<p className="text-xs text-muted-foreground">
										{tr(
											locale,
											"Le premier port devient le depart et le dernier devient l'arrivee.",
											"The first port becomes departure and the last becomes arrival.",
										)}
									</p>
								</div>

								<div className="space-y-2 rounded-2xl border border-dashed border-border/70 bg-muted/25 p-3">
									<div className="flex flex-wrap items-center gap-2 text-sm">
										<Badge variant="outline">{tr(locale, "Depart", "Departure")}</Badge>
										<span>{draft.portDepart || tr(locale, "Non defini", "Not set")}</span>
										<span className="text-muted-foreground">→</span>
										<Badge variant="outline">{tr(locale, "Arrivee", "Arrival")}</Badge>
										<span>{draft.portArrivee || tr(locale, "Non defini", "Not set")}</span>
									</div>

									{cruisePortStops.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											{tr(
												locale,
												"Ajoute des ports intermédiaires ici. Tu peux les remonter ou les descendre pour ajuster l'ordre.",
												"Add intermediate ports here. You can move them up or down to adjust the order.",
											)}
										</p>
									) : (
										<div className="space-y-2">
											{cruisePortStops.map((stop, index) => (
												<div
													key={`${stop.value}-${index}`}
													className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-2"
												>
													<div className="min-w-0">
														<p className="text-xs uppercase tracking-wide text-muted-foreground">
															{tr(locale, "Escale", "Stop")} {index + 1}
														</p>
														<p className="truncate text-sm font-medium">{stop.label}</p>
													</div>
													<div className="flex items-center gap-1">
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => moveCruisePortStop(index, "up")}
															disabled={index === 0}
														>
															<ChevronUp className="size-4" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => moveCruisePortStop(index, "down")}
															disabled={index === cruisePortStops.length - 1}
														>
															<ChevronDown className="size-4" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => removeCruisePortStop(index)}
														>
															<Trash2 className="size-4" />
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>

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
						<CardContent className="space-y-4 grid gap-3 md:grid-cols-2">
							<div className="grid gap-3">
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
							<div className="grid gap-3">
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
							</div>
							<div className="md:col-span-2 grid gap-3 md:grid-cols-2">
								<Field label={tr(locale, "Depot / personne", "Deposit / person")}>
									<Input
										type="number"
										min="0"
										step="0.01"
										value={draft.depot}
										onChange={(e) => setField("depot", e.target.value)}
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
								<p className="text-xs text-muted-foreground">{tr(locale, "Visible dans le PDF client.", "Visible in the client PDF.")}</p>
							</Field>
							<Field
								label={tr(locale, "Notes internes", "Internal notes")}
								className="md:col-span-2"
							>
								<Textarea
									rows={4}
									value={draft.notes}
									onChange={(e) => setField("notes", e.target.value)}
									placeholder={tr(locale, "Notes operationnelles internes, suivis, rappels, etc.", "Internal operational notes, follow-ups, reminders, etc.")}
								/>
								<p className="text-xs text-muted-foreground">{tr(locale, "Non visible dans le PDF client.", "Not visible in the client PDF.")}</p>
							</Field>
						</CardContent>
					</Card>
				</div>
			)}

			{/* VOLS TAB */}
			{tab === "vols" && (
				<>
					<div className="grid gap-4 lg:grid-cols-2">
						{/* VOLS ALLER */}
						<Card className="p-0">
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
						</Card>

						{/* VOLS RETOUR */}
						<Card className="p-0">
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
						</Card>
					</div>

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
				</>
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
													onChange={(e) => updateHotelStay("pre", "checkin", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Nuits pre", "Pre-stay nights")}>
												<Input
													type="number"
													min="0"
													value={draft.nuitsHotel}
													onChange={(e) => updateHotelStay("pre", "nights", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Date depart pre", "Pre-stay check-out date")}>
												<Input
													type="date"
													value={draft.hotelFin}
													onChange={(e) => updateHotelStay("pre", "checkout", e.target.value)}
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
													onChange={(e) => updateHotelStay("post", "checkin", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Nuits post", "Post-stay nights")}>
												<Input
													type="number"
													min="0"
													value={draft.nuitsHotelPost}
													onChange={(e) => updateHotelStay("post", "nights", e.target.value)}
												/>
											</Field>
											<Field label={tr(locale, "Date depart post", "Post-stay check-out date")}>
												<Input
													type="date"
													value={draft.hotelPostFin}
													onChange={(e) => updateHotelStay("post", "checkout", e.target.value)}
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
						<CardContent className="space-y-3">
							<Field label={tr(locale, "Transferts actives", "Transfers enabled")}>
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
							<div className="grid gap-3 md:grid-cols-2">
								<MoneyWithMode
									label={tr(locale, "Aeroport -> Hotel", "Airport -> Hotel")}
									value={draft.trA}
									mode={draft.trAMode}
									onValue={(v) => setField("trA", v)}
									onMode={(v) => setField("trAMode", v)}
								/>
								<Field label={tr(locale, "Detail", "Detail")}>
									<Input
										value={draft.trAComp}
										onChange={(e) => setField("trAComp", e.target.value)}
									/>
								</Field>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<MoneyWithMode
									label={tr(locale, "Hotel -> Port", "Hotel -> Port")}
									value={draft.trB}
									mode={draft.trBMode}
									onValue={(v) => setField("trB", v)}
									onMode={(v) => setField("trBMode", v)}
								/>
								<Field label={tr(locale, "Detail", "Detail")}>
									<Input
										value={draft.trBComp}
										onChange={(e) => setField("trBComp", e.target.value)}
									/>
								</Field>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<MoneyWithMode
									label={tr(locale, "Port -> Aeroport", "Port -> Airport")}
									value={draft.trC}
									mode={draft.trCMode}
									onValue={(v) => setField("trC", v)}
									onMode={(v) => setField("trCMode", v)}
								/>
								<Field label={tr(locale, "Detail", "Detail")}>
									<Input
										value={draft.trCComp}
										onChange={(e) => setField("trCComp", e.target.value)}
									/>
								</Field>
							</div>
							{hotelPost ? (
								<>
									<div className="grid gap-3 md:grid-cols-2">
										<MoneyWithMode
											label={tr(locale, "Port -> Hotel post", "Port -> Post-stay hotel")}
											value={draft.trD}
											mode={draft.trDMode}
											onValue={(v) => setField("trD", v)}
											onMode={(v) => setField("trDMode", v)}
										/>
										<Field label={tr(locale, "Detail", "Detail")}>
											<Input
												value={draft.trDComp}
												onChange={(e) => setField("trDComp", e.target.value)}
											/>
										</Field>
									</div>
									<div className="grid gap-3 md:grid-cols-2">
										<MoneyWithMode
											label={tr(locale, "Hotel post -> Aeroport", "Post-stay hotel -> Airport")}
											value={draft.trE}
											mode={draft.trEMode}
											onValue={(v) => setField("trE", v)}
											onMode={(v) => setField("trEMode", v)}
										/>
										<Field label={tr(locale, "Detail", "Detail")}>
											<Input
												value={draft.trEComp}
												onChange={(e) => setField("trEComp", e.target.value)}
											/>
										</Field>
									</div>
								</>
							) : null}
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
				<div className="space-y-4">
					<Card className="w-full">
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
								<div className="space-y-3">
									{resultRows.map((row) =>
										(() => {
											const rowHealth =
												row.margePct >= 16
													? { label: tr(locale, "Forte", "Strong"), variant: "default" }
													: row.margePct >= 10
														? { label: tr(locale, "Solide", "Solid"), variant: "secondary" }
														: row.margePct >= 6
															? { label: tr(locale, "A surveiller", "Watch"), variant: "outline" }
															: { label: tr(locale, "Faible", "Low"), variant: "destructive" };

											return (
												<article
													key={row.id}
													className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm"
												>
													<div className="mb-3 flex items-center justify-between gap-3">
														<h3 className="font-semibold">{row.label}</h3>
														<div className="flex items-center gap-2">
															<Badge variant={rowHealth.variant}>{rowHealth.label}</Badge>
															<Badge variant="outline">{row.id}</Badge>
														</div>
													</div>
													<div className="grid gap-3 xl:grid-cols-2">
														<div className="rounded-2xl border border-border/60 bg-card/70 p-3">
															<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Details du prix", "Price details")}</p>
															<dl className="mt-2 space-y-2 text-sm">
																{row.priceRows.map((item) => (
																	<StatLine
																		key={item.label}
																		label={item.label}
																		value={fmtCad(item.value)}
																	/>
																))}
															</dl>
														</div>
														<div className="rounded-2xl border border-border/60 bg-card/70 p-3">
															<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Details commission", "Commission details")}</p>
															<dl className="mt-2 space-y-2 text-sm">
																{row.commissionRows.map((item) => (
																	<StatLine
																		key={item.label}
																		label={item.label}
																		value={fmtCad(item.value)}
																	/>
																))}
															</dl>
														</div>
													</div>
													<div className="mt-4 grid gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-3 sm:grid-cols-3">
														<div>
															<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Par personne", "Per person")}</p>
															<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(row.calc.prixPers)}</p>
														</div>
														<div>
															<p className="text-xs uppercase tracking-wide text-muted-foreground">{tr(locale, "Par pers / nuit", "Per person / night")}</p>
															<p className="mt-1 text-xl font-semibold tabular-nums">{fmtCad(row.calc.prixPersNuit)}</p>
														</div>
														<div>
															<p className="text-xs uppercase tracking-wide text-muted-foreground">
																{tr(locale, `Total - ${base.pax} pax`, `Total - ${base.pax} pax`)}
															</p>
															<p className="mt-1 text-xl font-semibold tabular-nums text-primary">{fmtCad(row.calc.total)}</p>
														</div>
													</div>
												</article>
											);
										})(),
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* PROJETS TAB */}
			{tab === "projets" && (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader className="flex flex-row items-start justify-between gap-3">
							<div>
								<CardTitle>{tr(locale, "Dossier et export", "Project and export")}</CardTitle>
								<CardDescription>
									{tr(locale, "Enregistre, duplique, importe et exporte ton dossier de forfait.", "Save, duplicate, import, and export your package project.")}
								</CardDescription>
							</div>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="shrink-0"
									>
										<Menu className="size-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									align="end"
									className="w-64 rounded-xl border-border/70 p-2"
								>
									<div className="space-y-1">
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={saveProject}
											disabled={busy}
										>
											<Save /> {tr(locale, "Enregistrer", "Save")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={resetAll}
											disabled={busy}
										>
											<Calculator /> {tr(locale, "Nouveau", "New")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={exportPdf}
										>
											<FileText /> {tr(locale, "Export PDF client", "Client PDF export")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={() => openConversionPreview("quote")}
											disabled={busy || !selectedProjectId || !draft.clientId}
										>
											<FileText /> {tr(locale, "Convertir en devis", "Convert to quote")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={() => openConversionPreview("trip")}
											disabled={busy || !selectedProjectId || !draft.clientId}
										>
											<FolderOpen /> {tr(locale, "Convertir en voyage", "Convert to trip")}
										</Button>
										<div className="my-1 border-t border-border/70" />
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={exportExcel}
										>
											<Download /> {tr(locale, "Export Excel interne", "Internal Excel export")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={exportJson}
										>
											<Download /> {tr(locale, "Export JSON", "Export JSON")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={exportCsv}
										>
											<Download /> {tr(locale, "Export CSV", "Export CSV")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={() => importJsonRef.current?.click()}
										>
											<Upload /> {tr(locale, "Import JSON", "Import JSON")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={() => importCsvRef.current?.click()}
										>
											<Upload /> {tr(locale, "Import CSV", "Import CSV")}
										</Button>
										<Button
											type="button"
											variant="ghost"
											className="w-full justify-start"
											onClick={copySummary}
										>
											<Copy /> {tr(locale, "Copier synthese", "Copy summary")}
										</Button>
									</div>
								</PopoverContent>
							</Popover>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{tr(locale, "Mapping import vers voyage", "Trip import mapping")}
								</p>
								<div className="grid gap-2 sm:grid-cols-2">
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={importOptions.includeCruise}
											onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, includeCruise: checked === true }))}
										/>
										<span>{tr(locale, "Croisiere", "Cruise")}</span>
									</label>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={importOptions.includeFlights}
											onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, includeFlights: checked === true }))}
										/>
										<span>{tr(locale, "Vols", "Flights")}</span>
									</label>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={importOptions.includeHotels}
											onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, includeHotels: checked === true }))}
										/>
										<span>{tr(locale, "Hotels", "Hotels")}</span>
									</label>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={importOptions.includeTransfers}
											onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, includeTransfers: checked === true }))}
										/>
										<span>{tr(locale, "Transferts", "Transfers")}</span>
									</label>
								</div>
								<label className="flex items-center gap-2 text-sm">
									<Checkbox
										checked={importOptions.importIntoExistingTrip}
										onCheckedChange={(checked) => setImportOptions((prev) => ({ ...prev, importIntoExistingTrip: checked === true }))}
									/>
									<span>
										{tr(locale, "Importer aussi dans un voyage deja lie (mode dedoublonne)", "Also import into an already linked trip (deduplicated mode)")}
									</span>
								</label>
							</div>
							<p className="text-sm text-muted-foreground">
								{tr(locale, "Utilise le menu en haut a droite pour sauvegarder, exporter ou importer.", "Use the top-right menu to save, export, or import.")}
							</p>
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
								<div className="max-h-88 space-y-2 overflow-y-auto pr-1">
									{projects.map((project) => (
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
									))}
								</div>
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

			{/* CONVERSION PREVIEW DIALOG */}
			<Dialog
				open={previewOpen}
				onOpenChange={(next) => {
					if (!busy) {
						setPreviewOpen(next);
						if (!next) setPreviewPlan(null);
					}
				}}
			>
				<DialogContent className="max-w-3xl p-0">
					<DialogHeader className="px-4 pt-4">
						<DialogTitle>{tr(locale, "Apercu avant conversion", "Preview before conversion")}</DialogTitle>
						<DialogDescription>{previewAction ? actionLabel[previewAction] : tr(locale, "Conversion", "Conversion")}</DialogDescription>
					</DialogHeader>

					<div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 pb-4">
						{previewLoading ? (
							<p className="text-sm text-muted-foreground">{tr(locale, "Preparation de l'apercu...", "Preparing preview...")}</p>
						) : previewPlan ? (
							<>
								<div className="grid gap-2 sm:grid-cols-3">
									<div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
										<p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tr(locale, "Segments detectes", "Detected segments")}</p>
										<p className="text-lg font-semibold tabular-nums">{previewPlan.candidateCount || 0}</p>
									</div>
									<div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
										<p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tr(locale, "Seront importes", "Will be imported")}</p>
										<p className="text-lg font-semibold tabular-nums">{previewPlan.importCount || 0}</p>
									</div>
									<div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
										<p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tr(locale, "Ignores", "Skipped")}</p>
										<p className="text-lg font-semibold tabular-nums">{previewPlan.skippedCount || 0}</p>
									</div>
								</div>

								<p className="text-xs text-muted-foreground">
									{previewPlan.tripWillBeCreated
										? tr(locale, "Un nouveau voyage client sera cree lors de la conversion.", "A new client trip will be created during conversion.")
										: previewPlan.importIntoExistingTrip
											? tr(
													locale,
													"Les segments manquants seront ajoutes au voyage deja lie (sans doublons).",
													"Missing segments will be appended to the already linked trip (no duplicates).",
												)
											: tr(
													locale,
													"Le voyage deja lie sera reutilise sans ajout de segments.",
													"The already linked trip will be reused without importing segments.",
												)}
								</p>

								<div className="space-y-2">
									{Array.isArray(previewPlan.segments) && previewPlan.segments.length > 0 ? (
										previewPlan.segments.map((segment, index) => (
											<div
												key={`${segment.type}-${segment.title}-${index}`}
												className={cn("rounded-xl border px-3 py-2", segment.willImport ? "border-primary/40 bg-primary/5" : "border-border/70 bg-muted/10")}
											>
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">{segment.title || tr(locale, "Segment", "Segment")}</p>
														<p className="text-xs text-muted-foreground">{segment.location || tr(locale, "Sans lieu", "No location")}</p>
													</div>
													<div className="flex items-center gap-2">
														<Badge variant="outline">{segment.type}</Badge>
														<Badge variant={segment.willImport ? "default" : "secondary"}>
															{segment.willImport ? tr(locale, "Importe", "Import") : tr(locale, "Ignore", "Skip")}
														</Badge>
													</div>
												</div>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											{tr(locale, "Aucun segment a importer avec ces options.", "No segments to import with current options.")}
										</p>
									)}
								</div>
							</>
						) : (
							<p className="text-sm text-muted-foreground">{tr(locale, "Apercu indisponible.", "Preview unavailable.")}</p>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setPreviewOpen(false);
								setPreviewPlan(null);
							}}
							disabled={busy || previewLoading}
						>
							{tr(locale, "Annuler", "Cancel")}
						</Button>
						<Button
							type="button"
							onClick={confirmConversionFromPreview}
							disabled={busy || previewLoading || !previewPlan}
						>
							{previewAction ? actionLabel[previewAction] : tr(locale, "Confirmer", "Confirm")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
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
		<div className="space-y-2 p-3">
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

						<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
							<Field label={tr(locale, "Compagnie aerienne", "Airline")}>
								<SmartSelect
									value={segment.airline}
									onValueChange={(value) => onUpdate(direction, index, "airline", value)}
									options={airlineOptions}
									placeholder={tr(locale, "Selectionner", "Select")}
									searchPlaceholder={tr(locale, "Rechercher compagnie...", "Search airline...")}
									emptyMessage={tr(locale, "Aucune compagnie trouvee.", "No airline found.")}
									locale={locale}
								/>
							</Field>

							<Field label={tr(locale, "Operateur", "Operator")}>
								<SmartSelect
									value={segment.operator}
									onValueChange={(value) => onUpdate(direction, index, "operator", value)}
									options={airlineOptions}
									placeholder={tr(locale, "Selectionner", "Select")}
									searchPlaceholder={tr(locale, "Rechercher operateur...", "Search operator...")}
									emptyMessage={tr(locale, "Aucun operateur trouve.", "No operator found.")}
									locale={locale}
								/>
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

						<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
							<Field label={tr(locale, "Date depart", "Departure date")}>
								<Input
									type="date"
									value={segment.departDate}
									onChange={(e) => onUpdate(direction, index, "departDate", e.target.value)}
								/>
							</Field>

							<Field label={tr(locale, "Heure depart", "Departure time")}>
								<Input
									type="time"
									value={segment.departTime}
									onChange={(e) => onUpdate(direction, index, "departTime", e.target.value)}
								/>
							</Field>

							<Field label={tr(locale, "Date arrivee", "Arrival date")}>
								<Input
									type="date"
									value={segment.arriveDate}
									onChange={(e) => onUpdate(direction, index, "arriveDate", e.target.value)}
								/>
							</Field>

							<Field label={tr(locale, "Heure arrivee", "Arrival time")}>
								<Input
									type="time"
									value={segment.arriveTime}
									onChange={(e) => onUpdate(direction, index, "arriveTime", e.target.value)}
								/>
							</Field>
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

function SmartSelect({
	id,
	value,
	onValueChange,
	options,
	placeholder,
	searchPlaceholder,
	emptyMessage,
	locale = "fr",
	className,
	disabled = false,
	threshold = 10,
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const list = useMemo(() => {
		return (Array.isArray(options) ? options : [])
			.map((option) => {
				if (typeof option === "string") {
					return { value: option, label: option };
				}
				const value = String(option?.value ?? option?.label ?? "");
				const label = String(option?.label ?? option?.value ?? "");
				return { ...option, value, label };
			})
			.filter((option) => option.value && option.label);
	}, [options]);
	const useSearch = list.length > threshold;

	const selected = useMemo(() => list.find((option) => option.value === value) || null, [list, value]);

	const filtered = useMemo(() => {
		if (!useSearch) return list;
		if (!query.trim()) return list.slice(0, 150);
		const q = query.trim().toLowerCase();
		return list.filter((option) => option.label.toLowerCase().includes(q)).slice(0, 150);
	}, [list, query, useSearch]);

	if (!useSearch) {
		return (
			<select
				id={id}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				disabled={disabled}
				className={cn(
					"flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
					className,
				)}
			>
				<option value="">{placeholder}</option>
				{list.map((option) => (
					<option
						key={`${id || "smart"}-${option.value}`}
						value={option.value}
					>
						{option.label}
					</option>
				))}
			</select>
		);
	}

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
					className={cn("h-8 w-full justify-between rounded-lg border-input bg-transparent px-3 py-1 text-sm font-normal", className)}
				>
					<span className={cn("truncate text-left", !value && "text-muted-foreground")}>{selected?.label || placeholder}</span>
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
						placeholder={searchPlaceholder || tr(locale, "Rechercher...", "Search...")}
						className="h-9"
					/>
				</div>
				<div className="max-h-72 overflow-y-auto p-1 pt-0">
					<button
						type="button"
						onClick={() => {
							onValueChange("");
							setOpen(false);
							setQuery("");
						}}
						className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60", !value && "bg-muted/70")}
					>
						<Check className={cn("size-4 shrink-0", !value ? "opacity-100" : "opacity-0")} />
						<span className="truncate">{placeholder}</span>
					</button>
					{filtered.length === 0 ? (
						<p className="p-3 text-sm text-muted-foreground">{emptyMessage || tr(locale, "Aucune option trouvee.", "No option found.")}</p>
					) : null}
					{filtered.map((option) => {
						const isSelected = value === option.value;
						return (
							<button
								key={`${id || "smart"}-${option.value}`}
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
