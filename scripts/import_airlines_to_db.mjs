#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../app/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizeAirlineName(value) {
	return String(value || "").trim();
}

async function readAirlineNamesFromJson() {
	const filePath = path.resolve(process.cwd(), "data/airlines.json");
	const raw = await readFile(filePath, "utf-8");
	const parsed = JSON.parse(raw);
	const rows = Array.isArray(parsed) ? parsed : [];
	const unique = new Set();

	for (const row of rows) {
		const namesRaw = String(row?.Statistics?.Carriers?.Names || "");
		for (const token of namesRaw.split(",")) {
			const name = normalizeAirlineName(token);
			if (name) unique.add(name);
		}
	}

	return Array.from(unique).sort((a, b) => a.localeCompare(b, "fr"));
}

async function importAirlines() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is missing.");
	}

	const names = await readAirlineNamesFromJson();
	if (names.length === 0) {
		console.log("No airline names found in data/airlines.json.");
		return;
	}

	const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
	const prisma = new PrismaClient({ adapter });

	let created = 0;
	let existing = 0;

	try {
		for (const name of names) {
			const found = await prisma.supplier.findFirst({
				where: { name, category: "AIRLINE" },
				select: { id: true },
			});

			if (found) {
				existing += 1;
				continue;
			}

			await prisma.supplier.create({
				data: {
					name,
					category: "AIRLINE",
				},
			});
			created += 1;
		}
	} finally {
		await prisma.$disconnect();
	}

	console.log(`Airline import complete. Created: ${created}, Existing: ${existing}, Total scanned: ${names.length}.`);
}

importAirlines().catch((error) => {
	console.error("Airline import failed:", error.message || error);
	process.exit(1);
});
