import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ensureTripLinked, normalizeImportOptions } from "@/app/api/forfaits/_conversion";

export async function POST(request, { params }) {
	const user = await requireUser();
	const { forfaitId } = await params;
	const body = await request.json().catch(() => ({}));

	const source = await prisma.forfaitQuote.findUnique({ where: { id: forfaitId } });
	if (!source) return new NextResponse("Not found", { status: 404 });
	if (user.role !== "ADMIN" && source.createdById !== user.id) return new NextResponse("Forbidden", { status: 403 });

	const draft = source.payload;
	if (!draft || typeof draft !== "object") {
		return NextResponse.json({ error: "Invalid forfait payload." }, { status: 400 });
	}

	const tripLink = await ensureTripLinked(source, draft, normalizeImportOptions(body?.importOptions));
	if (tripLink?.error) {
		return NextResponse.json({ error: tripLink.error }, { status: tripLink.status || 400 });
	}

	revalidatePath("/trips");
	revalidatePath(`/trips/${tripLink.tripId}/overview`);

	return NextResponse.json({
		tripId: tripLink.tripId,
		tripCreated: Boolean(tripLink.created),
		importedSegments: tripLink.importedCount || 0,
		skippedSegments: tripLink.skippedCount || 0,
		redirectTo: `/trips/${tripLink.tripId}/overview`,
	});
}
