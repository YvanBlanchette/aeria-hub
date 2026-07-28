import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";
import { syncEventsToGoogleCalendar } from "@/lib/google-calendar";

function isAuthorized(request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;
	const auth = request.headers.get("authorization") || "";
	return auth === `Bearer ${secret}`;
}

export async function GET(request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const events = await buildCrmCalendarEvents();
	const connections = await prisma.googleCalendarConnection.findMany({ select: { userId: true } });

	let success = 0;
	const failures = [];

	for (const connection of connections) {
		try {
			await syncEventsToGoogleCalendar(connection.userId, events);
			success += 1;
		} catch (error) {
			failures.push({ userId: connection.userId, message: String(error?.message || error) });
		}
	}

	return NextResponse.json({
		syncedUsers: success,
		totalUsers: connections.length,
		eventCount: events.length,
		failures,
	});
}
