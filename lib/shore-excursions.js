import "server-only";

const BASE_URL = "https://www.shoreexcursionsgroup.com/results/";

// Falls back to the agency's real affiliate account so this works out of the
// box; override via env if the account ever changes without a redeploy.
const DEFAULT_AFFILIATE_ID = "1771540";
const DEFAULT_AGENT_EMAIL = "yvanblanchette@aeriavoyages.com";

/**
 * Builds a Shore Excursions Group affiliate deep link for a specific port day.
 * Requires the cruise line's and ship's SEG-assigned numeric codes (set on
 * the Supplier/CruiseShip catalog records) — returns null if either is
 * missing, so callers can hide the "Book your excursions" button entirely.
 * @param {{ lineCode?: string | null, shipCode?: string | null, arrivalDate: Date | string, nights?: number | null }} params
 */
export function buildShoreExcursionsUrl({ lineCode, shipCode, arrivalDate, nights }) {
	if (!lineCode || !shipCode || !arrivalDate) return null;

	const affiliateId = process.env.SHORE_EXCURSIONS_AFFILIATE_ID || DEFAULT_AFFILIATE_ID;
	const agentEmail = process.env.SHORE_EXCURSIONS_AGENT_EMAIL || DEFAULT_AGENT_EMAIL;
	const arrival = new Date(arrivalDate).toISOString().slice(0, 10);

	const url = new URL(BASE_URL);
	url.searchParams.set("line", lineCode);
	url.searchParams.set("shipId", shipCode);
	url.searchParams.set("arrival", arrival);
	if (nights != null) url.searchParams.set("nights", String(nights));
	url.searchParams.set("source", "portal");
	url.searchParams.set("id", affiliateId);
	url.searchParams.set("data", agentEmail);

	return url.toString();
}
