#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../app/generated/prisma/index.js";

const DEFAULT_INPUT = "data/itineraires_detailles.json";

function toIsoDate(value) {
	if (typeof value !== "string") return null;
	const s = value.trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function toTime(value) {
	if (typeof value !== "string") return null;
	const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return null;
	const hh = String(Math.min(23, Number(m[1]))).padStart(2, "0");
	const mm = String(Math.min(59, Number(m[2]))).padStart(2, "0");
	return `${hh}:${mm}`;
}

function slug(value) {
	return (value || "")
		.toString()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function buildExternalKey(item, index) {
	const shipId = (item?.ship_id || "ship").toString().trim();
	const startDate = toIsoDate(item?.start_date) || "nostart";
	const titleKey = slug(item?.title) || "notitle";
	return `${shipId}:${startDate}:${titleKey}:${index}`;
}

function normalizeItem(item, index) {
	const calls = Array.isArray(item?.port_calls) ? item.port_calls : [];
	const normalizedCalls = calls
		.map((call) => ({
			day: Number.isFinite(Number(call?.day)) ? Number(call.day) : null,
			date: toIsoDate(call?.date),
			port_name: typeof call?.port_name === "string" ? call.port_name.trim() : null,
			port_id: call?.port_id ? String(call.port_id) : null,
			port_key: call?.port_key ? String(call.port_key) : null,
			arrival: toTime(call?.arrival),
			departure: toTime(call?.departure),
			is_sea_day: Boolean(call?.is_sea_day),
			is_embark: Boolean(call?.is_embark),
			is_debark: Boolean(call?.is_debark),
			is_overnight: Boolean(call?.is_overnight),
		}))
		.filter((call) => call.date && call.port_name);

	return {
		externalKey: buildExternalKey(item, index),
		shipId: item?.ship_id ? String(item.ship_id) : null,
		shipName: typeof item?.ship_name === "string" && item.ship_name.trim() ? item.ship_name.trim() : "Unknown ship",
		cruiseLine: item?.cruise_line ? String(item.cruise_line) : null,
		title: item?.title ? String(item.title) : null,
		startDate: toIsoDate(item?.start_date),
		endDate: toIsoDate(item?.end_date),
		sourceUrl: item?.source_url ? String(item.source_url) : "",
		scrapedAt: item?.scraped_at ? String(item.scraped_at) : null,
		payload: {
			ship_name: item?.ship_name || null,
			ship_id: item?.ship_id || null,
			cruise_line: item?.cruise_line || null,
			title: item?.title || null,
			start_date: toIsoDate(item?.start_date),
			end_date: toIsoDate(item?.end_date),
			source_url: item?.source_url || null,
			port_calls: normalizedCalls,
		},
	};
}

function toDateOrNull(isoDate) {
	return isoDate ? new Date(`${isoDate}T00:00:00.000Z`) : null;
}

function toDateTimeOrNull(value) {
	if (!value) return null;
	const dt = new Date(value);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

async function main() {
	const inputArg = process.argv[2];
	const inputPath = path.resolve(process.cwd(), inputArg || DEFAULT_INPUT);
	const raw = await readFile(inputPath, "utf-8");
	const parsed = JSON.parse(raw);

	if (!Array.isArray(parsed)) {
		throw new Error("Input JSON must be an array of itineraries.");
	}

	const prisma = new PrismaClient({});

	let upserted = 0;
	try {
		for (let i = 0; i < parsed.length; i += 1) {
			const normalized = normalizeItem(parsed[i], i);
			if (!normalized.sourceUrl || normalized.payload.port_calls.length === 0) continue;

			await prisma.scrapedCruiseItinerary.upsert({
				where: { externalKey: normalized.externalKey },
				create: {
					externalKey: normalized.externalKey,
					shipId: normalized.shipId,
					shipName: normalized.shipName,
					cruiseLine: normalized.cruiseLine,
					title: normalized.title,
					startDate: toDateOrNull(normalized.startDate),
					endDate: toDateOrNull(normalized.endDate),
					sourceUrl: normalized.sourceUrl,
					scrapedAt: toDateTimeOrNull(normalized.scrapedAt),
					payload: normalized.payload,
				},
				update: {
					shipId: normalized.shipId,
					shipName: normalized.shipName,
					cruiseLine: normalized.cruiseLine,
					title: normalized.title,
					startDate: toDateOrNull(normalized.startDate),
					endDate: toDateOrNull(normalized.endDate),
					sourceUrl: normalized.sourceUrl,
					scrapedAt: toDateTimeOrNull(normalized.scrapedAt),
					payload: normalized.payload,
				},
			});
			upserted += 1;
		}
	} finally {
		await prisma.$disconnect();
	}

	console.log(`CruiseMapper DB sync complete: ${upserted} itinerary records upserted.`);
}

main().catch((error) => {
	console.error("CruiseMapper DB sync failed:", error.message || error);
	process.exit(1);
});
