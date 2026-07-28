#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function normalizeAirport(row) {
	const code = String(row?.code || "")
		.toUpperCase()
		.trim();
	const name = String(row?.name || "").trim();
	const city = String(row?.city || "").trim() || null;
	const country =
		String(row?.country || "")
			.toUpperCase()
			.trim() || null;
	const lat = Number.isFinite(row?.lat) ? Number(row.lat) : null;
	const lon = Number.isFinite(row?.lon) ? Number(row.lon) : null;

	if (code.length !== 3 || !name) return null;
	return { code, name, city, country, lat, lon };
}

async function readAirportsJson() {
	const filePath = path.resolve(process.cwd(), "data/airports.json");
	const raw = await readFile(filePath, "utf-8");
	const parsed = JSON.parse(raw);
	const rows = Array.isArray(parsed?.airports) ? parsed.airports : [];
	return rows.map(normalizeAirport).filter(Boolean);
}

async function loadTableColumns(client) {
	const result = await client.query(`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'airports'
	`);
	return new Set(result.rows.map((r) => r.column_name));
}

function resolveColumns(columnsSet) {
	const codeCol = columnsSet.has("code") ? "code" : columnsSet.has("iata") ? "iata" : null;
	const nameCol = columnsSet.has("name") ? "name" : null;
	const cityCol = columnsSet.has("city") ? "city" : null;
	const countryCol = columnsSet.has("country") ? "country" : null;
	const latCol = columnsSet.has("lat") ? "lat" : columnsSet.has("latitude") ? "latitude" : null;
	const lonCol = columnsSet.has("lon") ? "lon" : columnsSet.has("lng") ? "lng" : columnsSet.has("longitude") ? "longitude" : null;

	if (!codeCol || !nameCol) {
		throw new Error("Table public.airports must contain at least code (or iata) and name columns.");
	}

	return { codeCol, nameCol, cityCol, countryCol, latCol, lonCol };
}

async function importAirports() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is missing.");
	}

	const airports = await readAirportsJson();
	if (airports.length === 0) {
		console.log("No valid airports found in data/airports.json.");
		return;
	}

	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();

	let inserted = 0;
	let updated = 0;

	try {
		const columnsSet = await loadTableColumns(client);
		const cols = resolveColumns(columnsSet);

		for (const airport of airports) {
			const payload = {};
			payload[cols.codeCol] = airport.code;
			payload[cols.nameCol] = airport.name;
			if (cols.cityCol) payload[cols.cityCol] = airport.city;
			if (cols.countryCol) payload[cols.countryCol] = airport.country;
			if (cols.latCol) payload[cols.latCol] = airport.lat;
			if (cols.lonCol) payload[cols.lonCol] = airport.lon;

			const fields = Object.keys(payload);
			const values = fields.map((k) => payload[k]);
			const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
			const updates = fields
				.filter((field) => field !== cols.codeCol)
				.map((field) => `\"${field}\" = EXCLUDED.\"${field}\"`)
				.join(", ");

			const sql = `
				INSERT INTO public.airports (${fields.map((f) => `\"${f}\"`).join(", ")})
				VALUES (${placeholders})
				ON CONFLICT (\"${cols.codeCol}\")
				DO UPDATE SET ${updates}
				RETURNING (xmax = 0) AS inserted
			`;

			const result = await client.query(sql, values);
			if (result.rows[0]?.inserted) inserted += 1;
			else updated += 1;
		}
	} finally {
		await client.end();
	}

	console.log(`Airports import complete. Inserted: ${inserted}, Updated: ${updated}, Total processed: ${airports.length}.`);
}

importAirports().catch((error) => {
	console.error("Airports import failed:", error.message || error);
	process.exit(1);
});
