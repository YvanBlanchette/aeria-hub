import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createQuoteFromForfait, ensureTripLinked, normalizeImportOptions } from "@/app/api/forfaits/_conversion";

export async function POST(request, { params }) {
	const user = await requireUser();
	const { forfaitId } = await params;
	const body = await request.json().catch(() => ({}));

	const source = await prisma.forfaitQuote.findUnique({ where: { id: forfaitId } });
	if (!source) return new NextResponse("Not found", { status: 404 });
	if (user.role !== "ADMIN" && source.createdById !== user.id) return new NextResponse("Forbidden", { status: 403 });

	const draft = source.payload;

	const tripLink = await ensureTripLinked(source, draft, normalizeImportOptions(body?.importOptions));
	if (tripLink?.error) {
		return NextResponse.json({ error: tripLink.error }, { status: tripLink.status || 400 });
	}

	const quoteResult = await createQuoteFromForfait({
		source: {
			...source,
			tripId: tripLink.tripId,
		},
		tripId: tripLink.tripId,
	});
	if (quoteResult?.error) {
		return NextResponse.json({ error: quoteResult.error }, { status: quoteResult.status || 400 });
	}
	const quote = quoteResult.quote;

	await prisma.trip.updateMany({
		where: { id: tripLink.tripId, status: "INQUIRY" },
		data: { status: "QUOTED" },
	});

	revalidatePath(`/trips/${quote.trip.id}/quotes`);
	revalidatePath(`/trips/${quote.trip.id}/overview`);

	return NextResponse.json({
		quoteId: quote.id,
		tripId: quote.trip.id,
		tripCreated: Boolean(tripLink.created),
		importedSegments: tripLink.importedCount || 0,
		skippedSegments: tripLink.skippedCount || 0,
		redirectTo: `/trips/${quote.trip.id}/quotes`,
	});
}
