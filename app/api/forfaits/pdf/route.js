import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { renderForfaitPdf } from "@/lib/forfait-pdf";

export async function POST(request) {
	await requireUser();

	const payload = await request.json();
	if (!payload || typeof payload !== "object") {
		return new NextResponse("Invalid payload", { status: 400 });
	}

	const buffer = await renderForfaitPdf(payload);
	const fileName =
		String(payload?.draft?.projectName || "forfait")
			.replace(/[^a-zA-Z0-9-_ ]/g, "")
			.trim()
			.replace(/\s+/g, "-") || "forfait";

	return new NextResponse(buffer, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${fileName}.pdf"`,
			"Cache-Control": "private, no-store",
		},
	});
}
