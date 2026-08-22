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

export async function requireTripStaffAccessBySegment(segmentId) {
	const segment = await prisma.tripSegment.findUnique({ where: { id: segmentId }, select: { tripId: true } });
	if (!segment) notFound();
	return requireTripStaffAccess(segment.tripId);
}
