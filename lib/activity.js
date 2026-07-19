import { prisma } from "@/lib/prisma";

/**
 * Records an audit-trail entry. `clientId` should be set whenever the entry
 * relates to a client record (directly or via a child like Traveler/Note),
 * so it can be shown in that client's activity feed.
 * @param {{ entityType: string, entityId: string, action: string, description?: string, userId?: string, clientId?: string }} entry
 */
export async function logActivity(entry) {
  await prisma.activityLog.create({ data: entry });
}
