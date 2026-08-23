import "server-only";
import { prisma } from "@/lib/prisma";

const OPENWEATHER_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WIKIPEDIA_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";

// Free archive-api.open-meteo.com is non-commercial only (CC BY 4.0, attribution required).
// Set OPEN_METEO_API_KEY (a Professional-plan customer key) to switch to the commercial endpoint.
const OPEN_METEO_FREE_URL = "https://archive-api.open-meteo.com/v1/archive";
const OPEN_METEO_CUSTOMER_URL = "https://customer-archive-api.open-meteo.com/v1/archive";
const HISTORICAL_YEARS_BACK = 3;

const WMO_WEATHER_DESCRIPTIONS = {
	0: "clear sky",
	1: "mainly clear",
	2: "partly cloudy",
	3: "overcast",
	45: "fog",
	48: "depositing rime fog",
	51: "light drizzle",
	53: "moderate drizzle",
	55: "dense drizzle",
	56: "light freezing drizzle",
	57: "dense freezing drizzle",
	61: "slight rain",
	63: "moderate rain",
	65: "heavy rain",
	66: "light freezing rain",
	67: "heavy freezing rain",
	71: "slight snowfall",
	73: "moderate snowfall",
	75: "heavy snowfall",
	77: "snow grains",
	80: "slight rain showers",
	81: "moderate rain showers",
	82: "violent rain showers",
	85: "slight snow showers",
	86: "heavy snow showers",
	95: "thunderstorm",
	96: "thunderstorm with slight hail",
	99: "thunderstorm with heavy hail",
};

/** First segment before a comma ("Cozumel, Mexico" -> "Cozumel"), used for geocoding/wiki lookups. */
function primaryPlaceName(location) {
	return location.split(",")[0].trim();
}

/** Strips a trailing "(Country/Region)" qualifier and normalizes for matching against the CruisePort catalog. */
function normalizePortName(value) {
	return String(value || "")
		.replace(/\([^)]*\)\s*$/, "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/** Looks up our own enriched CruisePort catalog (scraped descriptions, coordinates, things-to-do) before falling back to external APIs. */
async function getCruisePortFromDb(location) {
	const target = normalizePortName(location);
	if (!target) return null;

	const candidates = await prisma.cruisePort.findMany({
		where: {
			OR: [
				{ name: { contains: primaryPlaceName(location), mode: "insensitive" } },
				{ displayText: { contains: primaryPlaceName(location), mode: "insensitive" } },
			],
		},
		select: {
			name: true,
			displayText: true,
			country: true,
			latitude: true,
			longitude: true,
			description: true,
			gettingFromPort: true,
			thingsToDo: true,
			sourceUrl: true,
		},
		take: 20,
	});

	return candidates.find((port) => normalizePortName(port.name) === target || normalizePortName(port.displayText) === target) || null;
}

/** Free, keyless geocoding (used for both the OpenWeather current-conditions call and Open-Meteo historical call). */
async function geocodeLocation(location) {
	const url = new URL(OPEN_METEO_GEOCODING_URL);
	url.searchParams.set("name", primaryPlaceName(location));
	url.searchParams.set("count", "1");
	url.searchParams.set("language", "en");
	url.searchParams.set("format", "json");

	const res = await fetch(url, { next: { revalidate: 86400 } });
	if (!res.ok) return null;
	const data = await res.json();
	const first = data.results?.[0];
	if (!first) return null;
	return { lat: first.latitude, lon: first.longitude, name: first.name, country: first.country };
}

async function getCurrentWeather(lat, lon, apiKey) {
	const url = new URL(OPENWEATHER_CURRENT_URL);
	url.searchParams.set("lat", String(lat));
	url.searchParams.set("lon", String(lon));
	url.searchParams.set("units", "metric");
	url.searchParams.set("appid", apiKey);

	const res = await fetch(url, { next: { revalidate: 3600 } });
	if (!res.ok) return null;
	const data = await res.json();

	return {
		tempC: data.main?.temp ?? null,
		feelsLikeC: data.main?.feels_like ?? null,
		tempMinC: data.main?.temp_min ?? null,
		tempMaxC: data.main?.temp_max ?? null,
		humidity: data.main?.humidity ?? null,
		description: data.weather?.[0]?.description ?? null,
		icon: data.weather?.[0]?.icon ?? null,
		windKph: typeof data.wind?.speed === "number" ? Math.round(data.wind.speed * 3.6) : null,
	};
}

/** Fetches one past year's daily weather for a given month/day (single-day range). */
async function getArchiveDayWeather(lat, lon, year, month, day) {
	const apiKey = process.env.OPEN_METEO_API_KEY;
	const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

	const url = new URL(apiKey ? OPEN_METEO_CUSTOMER_URL : OPEN_METEO_FREE_URL);
	url.searchParams.set("latitude", String(lat));
	url.searchParams.set("longitude", String(lon));
	url.searchParams.set("start_date", dateStr);
	url.searchParams.set("end_date", dateStr);
	url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code");
	url.searchParams.set("timezone", "auto");
	if (apiKey) url.searchParams.set("apikey", apiKey);

	const res = await fetch(url, { next: { revalidate: 30 * 86400 } });
	if (!res.ok) return null;
	const data = await res.json();
	const tempMax = data.daily?.temperature_2m_max?.[0];
	const tempMin = data.daily?.temperature_2m_min?.[0];
	const weatherCode = data.daily?.weather_code?.[0];
	if (typeof tempMax !== "number" || typeof tempMin !== "number") return null;
	return { tempMax, tempMin, weatherCode };
}

/**
 * Averages daily highs/lows for the same calendar date across the last few
 * past years (Open-Meteo Historical Weather API) to approximate typical
 * conditions for that time of year — as opposed to current conditions.
 */
async function getTypicalWeather(lat, lon, referenceDate) {
	const date = referenceDate ? new Date(referenceDate) : new Date();
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const mostRecentCompleteYear = new Date().getUTCFullYear() - 1;
	const years = Array.from({ length: HISTORICAL_YEARS_BACK }, (_, i) => mostRecentCompleteYear - i);

	const results = await Promise.all(years.map((year) => getArchiveDayWeather(lat, lon, year, month, day).catch(() => null)));
	const samples = results.filter(Boolean);
	if (samples.length === 0) return null;

	const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
	const codeCounts = new Map();
	for (const s of samples) {
		if (typeof s.weatherCode === "number") codeCounts.set(s.weatherCode, (codeCounts.get(s.weatherCode) ?? 0) + 1);
	}
	const [mostCommonCode] = [...codeCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];

	return {
		tempMaxC: avg(samples.map((s) => s.tempMax)),
		tempMinC: avg(samples.map((s) => s.tempMin)),
		description: mostCommonCode != null ? WMO_WEATHER_DESCRIPTIONS[mostCommonCode] || null : null,
		yearsSampled: samples.length,
		source: "Open-Meteo.com (CC BY 4.0)",
	};
}

async function getWikipediaSummary(location) {
	const title = encodeURIComponent(primaryPlaceName(location));
	const res = await fetch(`${WIKIPEDIA_SUMMARY_URL}/${title}`, {
		headers: { Accept: "application/json" },
		next: { revalidate: 86400 },
	});
	if (!res.ok) return null;
	const data = await res.json();
	if (data.type === "disambiguation" || !data.extract) return null;

	return {
		title: data.title,
		extract: data.extract,
		thumbnail: data.thumbnail?.source || null,
		sourceUrl: data.content_urls?.desktop?.page || null,
		sourceLabel: "Wikipedia",
		thingsToDo: null,
	};
}

/**
 * Aggregates destination info (coordinates, current weather, overview) for a
 * free-text location string such as a trip segment's `location` field.
 * Weather is omitted (not an error) when OPENWEATHER_API_KEY isn't configured.
 * @param {string} location
 * @param {string | null} [referenceDate] Trip date used to compute typical/historical weather.
 */
export async function getDestinationInfo(location, referenceDate) {
	if (!location || typeof location !== "string") return null;

	const apiKey = process.env.OPENWEATHER_API_KEY;

	const cruisePort = await getCruisePortFromDb(location).catch(() => null);

	let geo = cruisePort?.latitude != null && cruisePort?.longitude != null ? { lat: cruisePort.latitude, lon: cruisePort.longitude } : null;
	let overview = cruisePort?.description
		? {
				title: cruisePort.displayText || cruisePort.name,
				extract: cruisePort.description,
				gettingFromPort: cruisePort.gettingFromPort,
				thumbnail: null,
				sourceUrl: cruisePort.sourceUrl,
				sourceLabel: "CruiseMapper",
				thingsToDo: Array.isArray(cruisePort.thingsToDo) ? cruisePort.thingsToDo : null,
			}
		: null;

	if (!geo || !overview) {
		const [fallbackGeo, fallbackOverview] = await Promise.all([
			geo ? Promise.resolve(geo) : geocodeLocation(location).catch(() => null),
			overview ? Promise.resolve(overview) : getWikipediaSummary(location).catch(() => null),
		]);
		geo = geo || fallbackGeo;
		overview = overview || fallbackOverview;
	}

	const [weather, typicalWeather] = await Promise.all([
		geo && apiKey ? getCurrentWeather(geo.lat, geo.lon, apiKey).catch(() => null) : Promise.resolve(null),
		geo ? getTypicalWeather(geo.lat, geo.lon, referenceDate).catch(() => null) : Promise.resolve(null),
	]);

	return {
		location,
		coordinates: geo ? { lat: geo.lat, lon: geo.lon } : null,
		weather,
		typicalWeather,
		overview,
		thingsToDoUrl: `https://www.google.com/search?q=${encodeURIComponent(`things to do in ${primaryPlaceName(location)}`)}`,
	};
}
