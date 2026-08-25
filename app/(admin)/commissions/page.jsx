import { prisma } from "@/lib/prisma";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/admin/stat-card";

export const metadata = {
	title: "Commissions — ÆRIA Hub",
};

function CommissionStatCard({ label, value, icon: Icon }) {
	return (
		<Card className="overflow-hidden p-0">
			<CardHeader className="flex flex-row items-center gap-2">
				<Icon className="size-4" />
				<CardTitle className="text-sm uppercase tracking-[0.18em]">{label}</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center px-4 py-4">
				<p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
			</CardContent>
		</Card>
	);
}

export default async function CommissionsPage() {
	const segments = await prisma.tripSegment.findMany({
		where: { commissions: { some: {} } },
		select: {
			trip: {
				select: {
					id: true,
					name: true,
					createdAt: true,
					client: { select: { firstName: true, lastName: true } },
				},
			},
			commissions: { select: { amount: true, dueDate: true, status: true } },
		},
	});

	const tripMap = new Map();
	let pendingAmount = 0;
	let receivedAmount = 0;
	let overdueCount = 0;
	const now = new Date();
	for (const segment of segments) {
		const tripId = segment.trip.id;
		if (!tripMap.has(tripId)) {
			tripMap.set(tripId, {
				tripId,
				tripName: segment.trip.name,
				clientName: `${segment.trip.client.firstName} ${segment.trip.client.lastName}`,
				bookingDate: segment.trip.createdAt,
				totalAmount: 0,
				dueDates: [],
				allReceived: true,
				anyReceived: false,
			});
		}

		const row = tripMap.get(tripId);
		for (const commission of segment.commissions) {
			row.totalAmount += commission.amount;
			if (commission.dueDate) row.dueDates.push(commission.dueDate);
			if (commission.status === "RECEIVED") {
				row.anyReceived = true;
				receivedAmount += commission.amount;
			} else {
				row.allReceived = false;
				pendingAmount += commission.amount;
				if (commission.dueDate && new Date(commission.dueDate) < now) overdueCount += 1;
			}
		}
	}

	const rows = [...tripMap.values()].map((row) => {
		const dueDates = row.dueDates.slice().sort((a, b) => new Date(a) - new Date(b));
		return {
			...row,
			paymentDate: dueDates[0] || null,
			status: row.allReceived ? "RECEIVED" : row.anyReceived ? "PARTIAL" : "PENDING",
		};
	});

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					label="Pending"
					value={formatCurrency(pendingAmount)}
					icon={Clock}
				/>
				<StatCard
					label="Received"
					value={formatCurrency(receivedAmount)}
					icon={CheckCircle2}
				/>
				<StatCard
					label="Overdue portions"
					value={overdueCount}
					icon={AlertTriangle}
				/>
			</div>
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Commissions</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<CommissionsTable rows={rows} />
				</CardContent>
			</Card>
		</div>
	);
}
