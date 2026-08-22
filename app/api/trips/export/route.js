import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { tripsToCsv } from "@/lib/trips-csv";

export async function GET() {
	await requireAdmin();
	const trips = await prisma.trip.findMany({
		orderBy: { createdAt: "desc" },
		include: { client: { select: { primaryEmail: true } } },
	});
	return new NextResponse(tripsToCsv(trips), {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": 'attachment; filename="aeria-hub-trips.csv"',
		},
	});
}
