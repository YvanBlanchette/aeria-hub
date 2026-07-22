import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function serialize(rev) {
	return {
		id: rev.id,
		revisionNumber: rev.revisionNumber,
		passengers: rev.passengers,
		currency: rev.currency,
		totalSaleCents: rev.totalSaleCents,
		totalRevenueCents: rev.totalRevenueCents,
		avgMarginPct: rev.avgMarginPct,
		createdAt: rev.createdAt.toISOString(),
		createdById: rev.createdById,
	};
}

export async function GET(request, { params }) {
	const user = await requireUser();
	const { forfaitId } = await params;

	const quote = await prisma.forfaitQuote.findUnique({ where: { id: forfaitId }, select: { createdById: true } });
	if (!quote) return new NextResponse("Not found", { status: 404 });
	if (user.role !== "ADMIN" && quote.createdById !== user.id) return new NextResponse("Forbidden", { status: 403 });

	const revisions = await prisma.forfaitQuoteRevision.findMany({
		where: { forfaitQuoteId: forfaitId },
		orderBy: { revisionNumber: "desc" },
		take: 30,
	});

	return NextResponse.json({ revisions: revisions.map(serialize) });
}
