import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(request, { params }) {
	const user = await requireUser();
	const { forfaitId } = await params;

	const existing = await prisma.forfaitQuote.findUnique({ where: { id: forfaitId } });
	if (!existing) {
		return new NextResponse("Not found", { status: 404 });
	}

	if (user.role !== "ADMIN" && existing.createdById !== user.id) {
		return new NextResponse("Forbidden", { status: 403 });
	}

	await prisma.forfaitQuote.delete({ where: { id: forfaitId } });
	return new NextResponse(null, { status: 204 });
}
