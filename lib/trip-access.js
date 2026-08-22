import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Protects internal trip workspaces and mutations. Clients use the separate
 * portal views and must not reach staff trip operations by guessing an ID.
 */
export async function requireTripStaffAccess(tripId) {
	const user = await requireUser();
	if (user.role === "CLIENT") {
		throw new Error("Forbidden: staff trip access required.");
	}

	const where = user.role === "ADMIN" ? { id: tripId } : { id: tripId, client: { assignedAgentId: user.id } };
	const trip = await prisma.trip.findFirst({ where, select: { id: true, clientId: true, name: true } });
	if (!trip) notFound();
	return { user, trip };
}

async function resolveClientId(user) {
	if (user.clientId) return user.clientId;
	const email = user.email?.trim().toLowerCase();
	if (!email) return null;
	const client = await prisma.client.findFirst({
		where: {
			OR: [{ primaryEmail: { equals: email, mode: "insensitive" } }, { secondaryEmail: { equals: email, mode: "insensitive" } }],
		},
		select: { id: true },
	});
	return client?.id || null;
}

export async function requireTripAccess(tripId) {
	const user = await requireUser();

	if (user.role !== "CLIENT") {
		const where = user.role === "ADMIN" ? { id: tripId } : { id: tripId, client: { assignedAgentId: user.id } };
		const trip = await prisma.trip.findFirst({ where, select: { id: true, clientId: true, name: true } });
		if (!trip) notFound();
		return { user, trip, access: "staff" };
	}

	const clientId = await resolveClientId(user);
	if (!clientId) notFound();

	const trip = await prisma.trip.findFirst({
		where: {
			id: tripId,
			OR: [{ clientId }, { additionalClients: { some: { clientId } } }],
		},
		select: { id: true, clientId: true, name: true },
	});
	if (!trip) notFound();
	return { user, trip, access: "client", clientId };
}

export async function requireTripStaffAccessBySegment(segmentId) {
	const segment = await prisma.tripSegment.findUnique({ where: { id: segmentId }, select: { tripId: true } });
	if (!segment) notFound();
	return requireTripStaffAccess(segment.tripId);
}

export async function requireTripAccessBySegment(segmentId) {
	const segment = await prisma.tripSegment.findUnique({ where: { id: segmentId }, select: { tripId: true } });
	if (!segment) notFound();
	return requireTripAccess(segment.tripId);
}
