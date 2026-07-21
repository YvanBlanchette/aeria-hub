import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata = {
	title: "Settings — ÆRIA Hub",
};

export default async function SettingsPage() {
	const sessionUser = await requireUser();
	const now = new Date();
	const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	const startOfMonth = new Date(now);
	startOfMonth.setUTCDate(1);
	startOfMonth.setUTCHours(0, 0, 0, 0);

	const user = await prisma.user.findUnique({
		where: { id: sessionUser.id },
		select: { id: true, name: true, email: true, role: true, avatarUrl: true },
	});

	const isAdmin = user.role === "ADMIN";

	const [teamUsers, workspaceMetrics] = isAdmin
		? await Promise.all([
				prisma.user.findMany({
					orderBy: { createdAt: "asc" },
					select: { id: true, name: true, email: true, role: true, createdAt: true },
				}),
				Promise.all([
					prisma.user.count(),
					prisma.user.count({ where: { role: "ADMIN" } }),
					prisma.client.count(),
					prisma.client.count({ where: { status: "ACTIVE" } }),
					prisma.traveler.count(),
					prisma.trip.count(),
					prisma.trip.count({ where: { status: { in: ["BOOKED", "TRAVELING"] } } }),
					prisma.trip.count({ where: { startDate: { gte: now, lte: in30Days }, status: { in: ["BOOKED", "TRAVELING"] } } }),
					prisma.tripTask.count({ where: { completed: false } }),
					prisma.tripTask.count({ where: { completed: false, dueDate: { lt: now } } }),
					prisma.reminder.count({ where: { completed: false } }),
					prisma.reminder.count({ where: { completed: false, dueDate: { lt: now } } }),
					prisma.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
					prisma.invoice.count({ where: { status: "OVERDUE" } }),
					prisma.invoice.aggregate({
						where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
						_sum: { amount: true, amountPaid: true },
					}),
					prisma.invoice.aggregate({ where: { status: "PAID", updatedAt: { gte: startOfMonth } }, _sum: { amountPaid: true } }),
					prisma.document.count(),
					prisma.supplier.count(),
					prisma.segmentCommission.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
					prisma.activityLog.findMany({
						orderBy: { createdAt: "desc" },
						take: 10,
						include: {
							user: { select: { name: true } },
							client: { select: { id: true, firstName: true, lastName: true } },
						},
					}),
				]),
			])
		: [[], null];

	const workspaceSummary = workspaceMetrics
		? {
				teamCount: workspaceMetrics[0],
				adminCount: workspaceMetrics[1],
				totalClients: workspaceMetrics[2],
				activeClients: workspaceMetrics[3],
				totalTravelers: workspaceMetrics[4],
				totalTrips: workspaceMetrics[5],
				activeTrips: workspaceMetrics[6],
				departures30d: workspaceMetrics[7],
				openTasks: workspaceMetrics[8],
				overdueTasks: workspaceMetrics[9],
				openReminders: workspaceMetrics[10],
				overdueReminders: workspaceMetrics[11],
				openInvoices: workspaceMetrics[12],
				overdueInvoices: workspaceMetrics[13],
				openInvoiceBalance: (workspaceMetrics[14]._sum.amount || 0) - (workspaceMetrics[14]._sum.amountPaid || 0),
				paidThisMonth: workspaceMetrics[15]._sum.amountPaid || 0,
				totalDocuments: workspaceMetrics[16],
				totalSuppliers: workspaceMetrics[17],
				pendingCommissions: workspaceMetrics[18]._sum.amount || 0,
				recentActivity: workspaceMetrics[19],
			}
		: null;

	return (
		<div className="space-y-6">
			<Card className="border-border/70 bg-card/85 shadow-sm backdrop-blur-sm">
				<CardContent className="space-y-2 p-5 sm:p-6">
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Account and workspace</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Settings</h1>
					<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
						Manage your account, team access, and CRM workspace controls from one organized place.
					</p>
				</CardContent>
			</Card>

			<SettingsTabs
				user={user}
				isAdmin={isAdmin}
				teamUsers={teamUsers}
				workspaceSummary={workspaceSummary}
			/>
		</div>
	);
}
