#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../app/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

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

function toOptions(group) {
	const rows = Object.values(group || {});
	const dedup = new Map();
	for (const row of rows) {
		const sourceValue = String(row?.value || "").trim();
		const label = String(row?.text || row?.value || "").trim();
		if (!sourceValue || !label) continue;
		if (!dedup.has(sourceValue)) {
			dedup.set(sourceValue, {
				sourceValue,
				label,
			});
		}
	}
	return Array.from(dedup.values());
}

function splitPortLabel(label) {
	const clean = String(label || "").trim();
	if (!clean) return { name: "", country: null, displayText: null };
	const parts = clean
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length < 2) return { name: clean, country: null, displayText: clean };
	const country = parts[parts.length - 1];
	const name = parts.slice(0, -1).join(", ");
	return { name: name || clean, country: country || null, displayText: clean };
}

function matchLineNameForShip(shipLabel) {
	const normalized = String(shipLabel || "").toLowerCase();
	for (const [lineName, terms] of Object.entries(CRUISE_LINE_SHIP_TERMS)) {
		if (terms.some((term) => normalized.includes(term))) return lineName;
	}
	return null;
}

async function readJson(relativePath) {
	const filePath = path.resolve(process.cwd(), relativePath);
	const raw = await readFile(filePath, "utf-8");
	return JSON.parse(raw);
}

async function upsertCruiseLines(prisma, options) {
	const mapByName = new Map();
	for (const option of options) {
		const name = option.label;
		const existing = await prisma.supplier.findFirst({
			where: { name, category: "CRUISE" },
			select: { id: true, name: true },
		});

		if (existing) {
			mapByName.set(name, existing.id);
			continue;
		}

		const created = await prisma.supplier.create({
			data: { name, category: "CRUISE" },
			select: { id: true, name: true },
		});
		mapByName.set(name, created.id);
	}
	return mapByName;
}

async function ensureCruiseTables(prisma) {
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS "CruiseShip" (
			"id" TEXT NOT NULL,
			"sourceValue" TEXT,
			"name" TEXT NOT NULL,
			"supplierId" TEXT,
			"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
			"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT "CruiseShip_pkey" PRIMARY KEY ("id")
		)
	`);

	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS "CruisePort" (
			"id" TEXT NOT NULL,
			"sourceValue" TEXT,
			"name" TEXT NOT NULL,
			"displayText" TEXT,
			"country" TEXT,
			"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
			"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT "CruisePort_pkey" PRIMARY KEY ("id")
		)
	`);

	await prisma.$executeRawUnsafe(`
		CREATE UNIQUE INDEX IF NOT EXISTS "CruiseShip_sourceValue_key" ON "CruiseShip"("sourceValue")
	`);
	await prisma.$executeRawUnsafe(`
		CREATE UNIQUE INDEX IF NOT EXISTS "CruiseShip_supplierId_name_key" ON "CruiseShip"("supplierId", "name")
	`);
	await prisma.$executeRawUnsafe(`
		CREATE INDEX IF NOT EXISTS "CruiseShip_name_idx" ON "CruiseShip"("name")
	`);
	await prisma.$executeRawUnsafe(`
		CREATE INDEX IF NOT EXISTS "CruiseShip_supplierId_idx" ON "CruiseShip"("supplierId")
	`);

	await prisma.$executeRawUnsafe(`
		CREATE UNIQUE INDEX IF NOT EXISTS "CruisePort_sourceValue_key" ON "CruisePort"("sourceValue")
	`);
	await prisma.$executeRawUnsafe(`
		CREATE UNIQUE INDEX IF NOT EXISTS "CruisePort_name_country_key" ON "CruisePort"("name", "country")
	`);
	await prisma.$executeRawUnsafe(`
		CREATE INDEX IF NOT EXISTS "CruisePort_name_idx" ON "CruisePort"("name")
	`);

	await prisma.$executeRawUnsafe(`
		ALTER TABLE "CruiseShip"
		DROP CONSTRAINT IF EXISTS "CruiseShip_supplierId_fkey"
	`);
	await prisma.$executeRawUnsafe(`
		ALTER TABLE "CruiseShip"
		ADD CONSTRAINT "CruiseShip_supplierId_fkey"
		FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
		ON DELETE SET NULL ON UPDATE CASCADE
	`);
}

async function importCruiseCatalog() {
	const vendorsJson = await readJson("data/cruise-vendors.json");
	const shipsJson = await readJson("data/cruise-ships.json");
	const portsJson = await readJson("data/cruise-ports.json");

	const vendorOptions = toOptions(vendorsJson?.v);
	const shipOptions = toOptions(shipsJson?.s);
	const portOptions = toOptions(portsJson?.p);

	const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
	const prisma = new PrismaClient({ adapter });

	let lines = 0;
	let ships = 0;
	let ports = 0;

	try {
		await ensureCruiseTables(prisma);

		const lineIdByName = await upsertCruiseLines(prisma, vendorOptions);
		lines = lineIdByName.size;

		for (const option of shipOptions) {
			const lineName = matchLineNameForShip(option.label);
			const supplierId = lineName ? lineIdByName.get(lineName) || null : null;

			await prisma.cruiseShip.upsert({
				where: { sourceValue: option.sourceValue },
				create: {
					sourceValue: option.sourceValue,
					name: option.label,
					supplierId,
				},
				update: {
					name: option.label,
					supplierId,
				},
			});
			ships += 1;
		}

		for (const option of portOptions) {
			const parsed = splitPortLabel(option.label);
			if (!parsed.name) continue;

			await prisma.cruisePort.upsert({
				where: { sourceValue: option.sourceValue },
				create: {
					sourceValue: option.sourceValue,
					name: parsed.name,
					displayText: parsed.displayText,
					country: parsed.country,
				},
				update: {
					name: parsed.name,
					displayText: parsed.displayText,
					country: parsed.country,
				},
			});
			ports += 1;
		}
	} finally {
		await prisma.$disconnect();
	}

	console.log(`Cruise catalog import complete: ${lines} cruise lines, ${ships} ships, ${ports} ports upserted.`);
}

importCruiseCatalog().catch((error) => {
	console.error("Cruise catalog import failed:", error.message || error);
	process.exit(1);
});
