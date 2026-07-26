import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ITINERARIES_FILE = "data/itineraires_detailles.json";

function toTime(value, fallback) {
	if (typeof value !== "string") return fallback;
	const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return fallback;
	const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0");
	const mm = String(Math.min(59, Number(m[2]))).padStart(2, "0");
	return `${hh}:${mm}`;
}

function coerceIsoDate(value) {
	if (typeof value !== "string") return null;
	const s = value.trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function itineraryLabel(item) {
	const ship = item.ship_name || item.ship_id || "Unknown ship";
	const title = item.title || "Current itinerary";
	const start = item.start_date || "?";
	return `${ship} | ${title} | ${start}`;
}

function itineraryKey(item, index) {
	const ship = (item.ship_id || "ship").toString().trim();
	const start = (item.start_date || "nostart").toString().trim();
	return `${ship}:${start}:${index}`;
}

export async function loadCruiseMapperItineraries(relativeFilePath = DEFAULT_ITINERARIES_FILE) {
	const absolutePath = path.resolve(process.cwd(), relativeFilePath);
	const raw = await readFile(absolutePath, "utf-8");
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) {
		throw new Error("Expected an array in scraped itineraries JSON.");
	}

	return parsed
		.map((item, index) => {
			const calls = Array.isArray(item?.port_calls) ? item.port_calls : [];
			return {
				key: itineraryKey(item || {}, index),
				label: itineraryLabel(item || {}),
				item: {
					ship_name: item?.ship_name || null,
					ship_id: item?.ship_id || null,
					cruise_line: item?.cruise_line || null,
					title: item?.title || null,
					start_date: coerceIsoDate(item?.start_date),
					end_date: coerceIsoDate(item?.end_date),
					source_url: item?.source_url || null,
					port_calls: calls
						.map((call) => ({
							day: Number.isFinite(Number(call?.day)) ? Number(call.day) : null,
							date: coerceIsoDate(call?.date),
							port_name: call?.port_name || null,
							arrival: toTime(call?.arrival, null),
							departure: toTime(call?.departure, null),
							is_sea_day: Boolean(call?.is_sea_day),
							is_embark: Boolean(call?.is_embark),
							is_debark: Boolean(call?.is_debark),
						}))
						.filter((call) => call.date && call.port_name),
				},
			};
		})
		.filter((entry) => entry.item.port_calls.length > 0);
}

export function toSegmentDateTime(dateIso, hhmm) {
	const time = toTime(hhmm, "09:00");
	return new Date(`${dateIso}T${time}:00.000Z`);
}

export function inferCruiseEndpoints(portCalls) {
	const ports = portCalls.filter((c) => !c.is_sea_day);
	const first = ports[0]?.port_name || null;
	const last = ports[ports.length - 1]?.port_name || null;
	return { departurePort: first, arrivalPort: last };
}

export { DEFAULT_ITINERARIES_FILE };
