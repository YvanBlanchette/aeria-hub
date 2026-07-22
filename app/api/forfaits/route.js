import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

export async function GET() {
	const user = await requireUser();

	const rows = await prisma.forfaitQuote.findMany({
		where: user.role === "ADMIN" ? undefined : { createdById: user.id },
		orderBy: { updatedAt: "desc" },
		take: 200,
		include: { _count: { select: { revisions: true } } },
	});

	return NextResponse.json({
		projects: rows.map(serialize),
	});
}

export async function POST(request) {
	const user = await requireUser();
	const body = await request.json();

	const id = typeof body?.id === "string" && body.id.trim() ? body.id : null;
	const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Dossier sans titre";

	if (!body?.payload || typeof body.payload !== "object") {
		return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
	}
	if (!body?.constants || typeof body.constants !== "object") {
		return NextResponse.json({ error: "Invalid constants." }, { status: 400 });
	}

	if (id) {
		const existing = await prisma.forfaitQuote.findUnique({ where: { id } });
		if (!existing) {
			return NextResponse.json({ error: "Quote not found." }, { status: 404 });
		}
		if (user.role !== "ADMIN" && existing.createdById !== user.id) {
			return NextResponse.json({ error: "Forbidden." }, { status: 403 });
		}

		const nextRevision = (existing.currentRevision || 0) + 1;

		const updated = await prisma.forfaitQuote.update({
			where: { id },
			data: {
				name,
				clientId: body.clientId || null,
				tripId: body.tripId || null,
				payload: body.payload,
				constants: body.constants,
				currency: body.currency || "CAD",
				passengers: Math.max(1, toInt(body.passengers || 1)),
				totalSaleCents: Math.max(0, toInt(body.totalSaleCents || 0)),
				totalRevenueCents: Math.max(0, toInt(body.totalRevenueCents || 0)),
				avgMarginPct: toFloat(body.avgMarginPct || 0),
				currentRevision: nextRevision,
				revisions: {
					create: {
						revisionNumber: nextRevision,
						payload: body.payload,
						constants: body.constants,
						currency: body.currency || "CAD",
						passengers: Math.max(1, toInt(body.passengers || 1)),
						totalSaleCents: Math.max(0, toInt(body.totalSaleCents || 0)),
						totalRevenueCents: Math.max(0, toInt(body.totalRevenueCents || 0)),
						avgMarginPct: toFloat(body.avgMarginPct || 0),
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
			name,
			clientId: body.clientId || null,
			tripId: body.tripId || null,
			createdById: user.id,
			payload: body.payload,
			constants: body.constants,
			currency: body.currency || "CAD",
			passengers: Math.max(1, toInt(body.passengers || 1)),
			totalSaleCents: Math.max(0, toInt(body.totalSaleCents || 0)),
			totalRevenueCents: Math.max(0, toInt(body.totalRevenueCents || 0)),
			avgMarginPct: toFloat(body.avgMarginPct || 0),
			currentRevision: 1,
			revisions: {
				create: {
					revisionNumber: 1,
					payload: body.payload,
					constants: body.constants,
					currency: body.currency || "CAD",
					passengers: Math.max(1, toInt(body.passengers || 1)),
					totalSaleCents: Math.max(0, toInt(body.totalSaleCents || 0)),
					totalRevenueCents: Math.max(0, toInt(body.totalRevenueCents || 0)),
					avgMarginPct: toFloat(body.avgMarginPct || 0),
					createdById: user.id,
				},
			},
		},
		include: { _count: { select: { revisions: true } } },
	});

	return NextResponse.json({ project: serialize(created) }, { status: 201 });
}
