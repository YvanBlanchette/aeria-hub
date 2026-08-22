"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getClientPortalRecord } from "@/lib/client-portal";

export async function submitClientRequest(formData) {
	const user = await requireUser();
	if (user.role !== "CLIENT") return;

	const portal = await getClientPortalRecord(user);
	if (!portal) return;

	const messageValue = formData.get("message");
	const message = typeof messageValue === "string" ? messageValue.trim() : "";
	if (!message) return;

	await prisma.inquiry.create({
		data: {
			name: `${portal.client.firstName} ${portal.client.lastName}`.trim(),
			email: user.email,
			source: "client_portal",
			status: "NEW",
			notes: message,
			assignedAgentId: portal.client.assignedAgentId,
			convertedClientId: portal.client.id,
		},
	});

	revalidatePath("/requests");
}
