import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { normalizeImportOptions, previewTripSegmentPlan } from "@/app/api/forfaits/_conversion";

function segmentFingerprint(segment) {
	const start = segment.startDateTime ? new Date(segment.startDateTime).toISOString() : "";
	const end = segment.endDateTime ? new Date(segment.endDateTime).toISOString() : "";
	return [segment.type, segment.title || "", segment.location || "", start, end].join("|").toLowerCase();
}

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

	const plan = await previewTripSegmentPlan(source, draft, normalizeImportOptions(body?.importOptions));
	const importFingerprints = new Set((plan.toCreateSegments || []).map((segment) => segmentFingerprint(segment)));

	return NextResponse.json({
		tripId: plan.tripId,
		tripExists: plan.tripExists,
		tripWillBeCreated: plan.tripWillBeCreated,
		importIntoExistingTrip: plan.importIntoExistingTrip,
		candidateCount: plan.candidates.length,
		importCount: plan.toCreate.length,
		skippedCount: plan.skipped.length,
		segments: plan.candidates.map((segment) => ({
			type: segment.type,
			title: segment.title,
			location: segment.location || null,
			startDateTime: segment.startDateTime || null,
			endDateTime: segment.endDateTime || null,
			cost: segment.cost || null,
			details: segment.details || null,
			willImport: importFingerprints.has(segmentFingerprint(segment)),
		})),
	});
}
