import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDestinationInfo } from "@/lib/destination-info";

export async function GET(request) {
	await requireUser();

	const { searchParams } = new URL(request.url);
	const location = searchParams.get("location");
	const date = searchParams.get("date");
	if (!location) {
		return NextResponse.json({ error: "Missing location" }, { status: 400 });
	}

	const info = await getDestinationInfo(location, date);
	return NextResponse.json(info, { headers: { "Cache-Control": "private, max-age=3600" } });
}
