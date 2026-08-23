import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "../app/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Strips a trailing "(Country/Region)" qualifier and normalizes for fuzzy matching. */
function normalizeName(value) {
	return String(value || "")
		.replace(/\([^)]*\)\s*$/, "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function splitScrapedCountry(name) {
	const match = String(name || "").match(/\(([^)]*)\)\s*$/);
	return match ? match[1].trim() : null;
}

const scraped = JSON.parse(await readFile(new URL("./output_v2/ports.json", import.meta.url)));
const existing = await prisma.cruisePort.findMany({ select: { id: true, name: true, country: true, sourceValue: true } });

const existingByNormalizedName = new Map();
for (const port of existing) {
	const key = normalizeName(port.name);
	if (!existingByNormalizedName.has(key)) existingByNormalizedName.set(key, []);
	existingByNormalizedName.get(key).push(port);
}

let updated = 0;
let inserted = 0;
let skippedAmbiguous = 0;

for (const port of scraped) {
	const key = normalizeName(port.name);
	const candidates = existingByNormalizedName.get(key) || [];

	const enrichment = {
		externalId: port.external_id ? String(port.external_id) : null,
		latitude: typeof port.latitude === "number" ? port.latitude : null,
		longitude: typeof port.longitude === "number" ? port.longitude : null,
		locode: port.locode || null,
		region: port.region || null,
		description: port.description || null,
		gettingFromPort: port.getting_from_port || null,
		thingsToDo: Array.isArray(port.things_to_do) && port.things_to_do.length ? port.things_to_do : undefined,
		sourceUrl: port.url || null,
	};

	if (candidates.length === 1) {
		await prisma.cruisePort.update({ where: { id: candidates[0].id }, data: enrichment });
		updated += 1;
		continue;
	}

	if (candidates.length > 1) {
		// Ambiguous (multiple existing rows share this normalized name) — leave untouched for manual review.
		skippedAmbiguous += 1;
		continue;
	}

	const country = port.country || splitScrapedCountry(port.name);
	try {
		const created = await prisma.cruisePort.create({
			data: {
				name: port.city || normalizeName(port.name).replace(/\b\w/g, (c) => c.toUpperCase()),
				displayText: port.name,
				country,
				...enrichment,
			},
		});
		existingByNormalizedName.set(key, [{ id: created.id, name: created.name, country: created.country }]);
		inserted += 1;
	} catch (error) {
		if (error?.code === "P2002") {
			skippedAmbiguous += 1;
			continue;
		}
		throw error;
	}
}

console.log(`Audit complete: ${existing.length} existing ports, ${scraped.length} scraped ports.`);
console.log(`  Updated (enriched) existing rows: ${updated}`);
console.log(`  Inserted new rows: ${inserted}`);
console.log(`  Skipped (ambiguous name match): ${skippedAmbiguous}`);
console.log(`  Existing rows with no scrape match (left untouched): ${existing.length - updated - skippedAmbiguous}`);

await prisma.$disconnect();
