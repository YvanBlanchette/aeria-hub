import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const DEFAULT_CURRENCY = "CAD";
const MAX_PROJECTS = 200;

function isRecord(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toInt(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.trunc(n);
}

function toFloat(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return n;
}

function serialize(item) {
	return {
		id: item.id,
		name: item.name,
		clientId: item.clientId,
		tripId: item.tripId,
		currency: item.currency,
		passengers: item.passengers,
		totalSaleCents: item.totalSaleCents,
		totalRevenueCents: item.totalRevenueCents,
		avgMarginPct: item.avgMarginPct,
		currentRevision: item.currentRevision,
		revisionCount: item._count?.revisions ?? 0,
		payload: item.payload,
		constants: item.constants,
		updatedAt: item.updatedAt.toISOString(),
	};
}

function sanitizeBody(body) {
	if (!isRecord(body)) {
		return { error: "Invalid request body." };
	}

	if (!isRecord(body.payload)) {
		return { error: "Invalid payload." };
	}

	if (!isRecord(body.constants)) {
		return { error: "Invalid constants." };
	}

	const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
	const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Dossier sans titre";

	return {
		value: {
			id,
			name,
			clientId: typeof body.clientId === "string" && body.clientId.trim() ? body.clientId : null,
			tripId: typeof body.tripId === "string" && body.tripId.trim() ? body.tripId : null,
			payload: body.payload,
			constants: body.constants,
			currency: typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : DEFAULT_CURRENCY,
			passengers: Math.max(1, toInt(body.passengers || 1)),
			totalSaleCents: Math.max(0, toInt(body.totalSaleCents || 0)),
			totalRevenueCents: Math.max(0, toInt(body.totalRevenueCents || 0)),
			avgMarginPct: toFloat(body.avgMarginPct || 0),
		},
	};
}

async function readJsonBody(request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

export async function GET() {
	const user = await requireUser();
	try {
		const rows = await prisma.forfaitQuote.findMany({
			where: user.role === "ADMIN" ? undefined : { createdById: user.id },
			orderBy: { updatedAt: "desc" },
			take: MAX_PROJECTS,
			include: { _count: { select: { revisions: true } } },
		});

		return NextResponse.json({
			projects: rows.map(serialize),
		});
	} catch {
		return NextResponse.json({ error: "Failed to list projects." }, { status: 500 });
	}
}

export async function POST(request) {
	const user = await requireUser();
	const rawBody = await readJsonBody(request);
	if (!rawBody) {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const parsed = sanitizeBody(rawBody);
	if (parsed.error) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}

	const payload = parsed.value;

	try {
		if (payload.id) {
			const existing = await prisma.forfaitQuote.findUnique({ where: { id: payload.id } });
			if (!existing) {
				return NextResponse.json({ error: "Quote not found." }, { status: 404 });
			}
			if (user.role !== "ADMIN" && existing.createdById !== user.id) {
				return NextResponse.json({ error: "Forbidden." }, { status: 403 });
			}

			const nextRevision = (existing.currentRevision || 0) + 1;

			const updated = await prisma.forfaitQuote.update({
				where: { id: payload.id },
				data: {
					name: payload.name,
					clientId: payload.clientId,
					tripId: payload.tripId,
					payload: payload.payload,
					constants: payload.constants,
					currency: payload.currency,
					passengers: payload.passengers,
					totalSaleCents: payload.totalSaleCents,
					totalRevenueCents: payload.totalRevenueCents,
					avgMarginPct: payload.avgMarginPct,
					currentRevision: nextRevision,
					revisions: {
						create: {
							revisionNumber: nextRevision,
							payload: payload.payload,
							constants: payload.constants,
							currency: payload.currency,
							passengers: payload.passengers,
							totalSaleCents: payload.totalSaleCents,
							totalRevenueCents: payload.totalRevenueCents,
							avgMarginPct: payload.avgMarginPct,
							createdById: user.id,
						},
					},
				},
				include: { _count: { select: { revisions: true } } },
			});

			return NextResponse.json({ project: serialize(updated) });
		}

		const created = await prisma.forfaitQuote.create({
			data: {
				name: payload.name,
				clientId: payload.clientId,
				tripId: payload.tripId,
				createdById: user.id,
				payload: payload.payload,
				constants: payload.constants,
				currency: payload.currency,
				passengers: payload.passengers,
				totalSaleCents: payload.totalSaleCents,
				totalRevenueCents: payload.totalRevenueCents,
				avgMarginPct: payload.avgMarginPct,
				currentRevision: 1,
				revisions: {
					create: {
						revisionNumber: 1,
						payload: payload.payload,
						constants: payload.constants,
						currency: payload.currency,
						passengers: payload.passengers,
						totalSaleCents: payload.totalSaleCents,
						totalRevenueCents: payload.totalRevenueCents,
						avgMarginPct: payload.avgMarginPct,
						createdById: user.id,
					},
				},
			},
			include: { _count: { select: { revisions: true } } },
		});

		return NextResponse.json({ project: serialize(created) }, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Could not persist project." }, { status: 500 });
	}
}
