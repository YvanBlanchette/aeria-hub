"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";
import { syncEventsToGoogleCalendar } from "@/lib/google-calendar";

export async function disconnectGoogleCalendar() {
	const user = await requireUser();
	await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });
	revalidatePath("/calendar");
	revalidatePath("/settings");
}

export async function syncGoogleCalendar() {
	const user = await requireUser();
	const events = await buildCrmCalendarEvents();
	await syncEventsToGoogleCalendar(user.id, events);
	revalidatePath("/calendar");
	revalidatePath("/settings");
}
