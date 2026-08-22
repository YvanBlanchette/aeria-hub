import "server-only";
import { prisma } from "@/lib/prisma";

export async function resolveClientPortalContext(user) {
	if (!user || user.role !== "CLIENT") return null;

	const normalizedEmail = (user.email || "").trim().toLowerCase();
	if (!normalizedEmail) return null;

	const client = await prisma.client.findFirst({
		where: {
			OR: [{ primaryEmail: { equals: normalizedEmail, mode: "insensitive" } }, { secondaryEmail: { equals: normalizedEmail, mode: "insensitive" } }],
		},
		include: {
			trips: {
				orderBy: { startDate: "asc" },
				include: {
					segments: { orderBy: [{ sortOrder: "asc" }, { startDateTime: "asc" }] },
					invoices: true,
					tasks: true,
					payments: true,
					quotes: true,
				},
			},
			invoices: {
				orderBy: { dueDate: "asc" },
			},
			convertedInquiries: {
				orderBy: { createdAt: "desc" },
				take: 20,
			},
			reminders: {
				where: { completed: false },
				orderBy: { dueDate: "asc" },
			},
			notes: {
				orderBy: { createdAt: "desc" },
				take: 10,
			},
		},
	});

	if (!client) return null;
	return { client, clientId: client.id };
}

export async function getClientPortalRecord(user) {
	return resolveClientPortalContext(user);
}

export function getClientOutstandingBalance(client) {
	if (!client?.invoices?.length) return 0;

	return client.invoices.reduce((sum, invoice) => {
		const outstanding = Math.max((invoice.amount ?? 0) - (invoice.amountPaid ?? 0), 0);
		return sum + outstanding;
	}, 0);
}

export function getNextPaymentDate(client) {
	if (!client?.invoices?.length) return null;
	const upcoming = [...client.invoices]
		.filter((invoice) => invoice.dueDate)
		.filter((invoice) => (invoice.amount ?? 0) > (invoice.amountPaid ?? 0))
		.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

	return upcoming[0]?.dueDate || null;
}

export function getNextDeparture(client) {
	if (!client?.trips?.length) return null;
	const upcoming = [...client.trips]
		.filter((trip) => trip.startDate)
		.filter((trip) => trip.status !== "CANCELLED")
		.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

	return upcoming[0]?.startDate || null;
}

export function getClientTripWhere(clientId) {
	return { clientId };
}

export function getClientInvoiceWhere(clientId) {
	return { clientId };
}

export function getClientReminderWhere(clientId) {
	return { clientId, completed: false };
}
