import "server-only";
import { prisma } from "@/lib/prisma";
import { invoiceScope, reminderScope, tripScope } from "@/lib/visibility-scope";

function atStartOfDay(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function atEndOfDay(date) {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
}

/**
 * Build normalized CRM events for calendar and sync.
 * @param {{ from?: Date, to?: Date, user?: { id: string, role?: string } }} opts
 */
export async function buildCrmCalendarEvents(opts = {}) {
	const now = new Date();
	const from = opts.from ? atStartOfDay(opts.from) : atStartOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
	const to = opts.to ? atEndOfDay(opts.to) : atEndOfDay(new Date(now.getFullYear(), now.getMonth() + 4, 0));
	const scopedTrips = tripScope(opts.user);
	const scopedReminders = reminderScope(opts.user);
	const scopedInvoices = invoiceScope(opts.user);

	const [trips, reminders, invoices] = await Promise.all([
		prisma.trip.findMany({
			where: {
				...scopedTrips,
				OR: [{ startDate: { lte: to }, endDate: { gte: from } }, { finalPaymentDate: { gte: from, lte: to } }],
			},
			select: {
				id: true,
				name: true,
				destination: true,
				status: true,
				startDate: true,
				endDate: true,
				finalPaymentDate: true,
				client: { select: { id: true, firstName: true, lastName: true, assignedAgentId: true, assignedAgent: { select: { id: true, name: true } } } },
			},
			orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
		}),
		prisma.reminder.findMany({
			where: { ...scopedReminders, dueDate: { gte: from, lte: to }, completed: false },
			select: {
				id: true,
				title: true,
				dueDate: true,
				type: true,
				client: { select: { id: true, firstName: true, lastName: true, assignedAgentId: true, assignedAgent: { select: { id: true, name: true } } } },
			},
			orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
		}),
		prisma.invoice.findMany({
			where: {
				...scopedInvoices,
				dueDate: { gte: from, lte: to },
				status: { in: ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
			},
			select: {
				id: true,
				invoiceNumber: true,
				dueDate: true,
				status: true,
				amount: true,
				amountPaid: true,
				client: { select: { id: true, firstName: true, lastName: true, assignedAgentId: true, assignedAgent: { select: { id: true, name: true } } } },
			},
			orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
		}),
	]);

	const events = [];

	for (const trip of trips) {
		const clientName = `${trip.client.firstName} ${trip.client.lastName}`.trim();
		const assignedAgentId = trip.client.assignedAgentId || null;
		const assignedAgentName = trip.client.assignedAgent?.name || null;

		if (trip.startDate && trip.endDate) {
			events.push({
				id: `trip-vacation-${trip.id}`,
				type: "vacation",
				title: `${clientName} - ${trip.name}`,
				description: `${trip.destination || ""}`.trim(),
				startDate: trip.startDate,
				endDate: trip.endDate,
				allDay: true,
				clientName,
				tripId: trip.id,
				tripName: trip.name,
				tripStatus: trip.status,
				assignedAgentId,
				assignedAgentName,
			});
		}

		if (trip.finalPaymentDate) {
			events.push({
				id: `trip-final-payment-${trip.id}`,
				type: "finalPayment",
				title: `Final payment - ${clientName}`,
				description: trip.name,
				startDate: trip.finalPaymentDate,
				endDate: trip.finalPaymentDate,
				allDay: true,
				clientName,
				tripId: trip.id,
				tripName: trip.name,
				tripStatus: trip.status,
				assignedAgentId,
				assignedAgentName,
			});
		}
	}

	for (const reminder of reminders) {
		const clientName = `${reminder.client.firstName} ${reminder.client.lastName}`.trim();
		const assignedAgentId = reminder.client.assignedAgentId || null;
		const assignedAgentName = reminder.client.assignedAgent?.name || null;
		events.push({
			id: `reminder-${reminder.id}`,
			type: "reminder",
			title: reminder.title,
			description: `Reminder for ${clientName}`,
			startDate: reminder.dueDate,
			endDate: reminder.dueDate,
			allDay: true,
			clientName,
			reminderType: reminder.type,
			assignedAgentId,
			assignedAgentName,
		});
	}

	for (const invoice of invoices) {
		if (!invoice.dueDate) continue;
		const clientName = `${invoice.client.firstName} ${invoice.client.lastName}`.trim();
		const assignedAgentId = invoice.client.assignedAgentId || null;
		const assignedAgentName = invoice.client.assignedAgent?.name || null;
		events.push({
			id: `invoice-due-${invoice.id}`,
			type: "invoiceDue",
			title: `Invoice due - ${invoice.invoiceNumber}`,
			description: `${clientName} (${invoice.amountPaid / 100} / ${invoice.amount / 100})`,
			startDate: invoice.dueDate,
			endDate: invoice.dueDate,
			allDay: true,
			clientName,
			invoiceId: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			invoiceStatus: invoice.status,
			assignedAgentId,
			assignedAgentName,
		});
	}

	return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}
