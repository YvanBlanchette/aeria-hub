import Link from "next/link";
import { Plane, CalendarClock, Receipt, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { CopyableText } from "@/components/clients/copyable-text";

export const metadata = {
	title: "Dashboard — ÆRIA Hub",
};

export default async function DashboardPage() {
	const user = await requireUser();
	const now = new Date();
	const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const [activeBookings, upcomingDepartures, unpaidInvoices, newInquiries, recentClients] = await Promise.all([
		prisma.trip.count({ where: { status: { in: ["BOOKED", "TRAVELING"] } } }),
		prisma.trip.count({
			where: {
				startDate: { gte: now, lte: in30Days },
				status: { in: ["BOOKED", "TRAVELING"] },
			},
		}),
		prisma.invoice.count({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
		prisma.inquiry.count({ where: { status: "NEW" } }),
		prisma.client.findMany({
			orderBy: { createdAt: "desc" },
			take: 5,
			select: { id: true, firstName: true, lastName: true, primaryEmail: true, primaryPhone: true, status: true, createdAt: true },
		}),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name?.split(" ")[0]}</h1>
				<p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across ÆRIA Hub.</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Active bookings"
					value={activeBookings}
					icon={Plane}
				/>
				<StatCard
					label="Upcoming departures"
					value={upcomingDepartures}
					icon={CalendarClock}
				/>
				<StatCard
					label="Unpaid invoices"
					value={unpaidInvoices}
					icon={Receipt}
				/>
				<StatCard
					label="New inquiries"
					value={newInquiries}
					icon={Inbox}
				/>
			</div>

			<Card className="p-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2 mb-0">
					<CardTitle>Recent clients</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableBody>
							{recentClients.length === 0 ? (
								<TableRow className="bg-card">
									<TableCell
										colSpan={6}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										No clients yet.
									</TableCell>
								</TableRow>
							) : (
								recentClients.map((client) => (
									<TableRow
										key={client.id}
										className="bg-card"
									>
										<TableCell>
											<Link
												href={`/clients/${client.id}`}
												className="flex items-center gap-3"
											>
												<Avatar className="size-8">
													<AvatarFallback className="bg-secondary text-xs">{initials(`${client.firstName} ${client.lastName}`)}</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">
														{client.firstName} {client.lastName}
													</p>
												</div>
											</Link>
										</TableCell>
										<TableCell className="text-muted-foreground">
											<CopyableText value={client.primaryEmail} label="email" />
										</TableCell>
										<TableCell className="text-muted-foreground">
											<CopyableText value={client.primaryPhone} label="phone" />
										</TableCell>
										<TableCell className="text-muted-foreground">
											<Badge
												variant={client.status === "ACTIVE" ? "default" : "secondary"}
												className="text-[10px] capitalize"
											>
												{client.status.toLowerCase()}
											</Badge>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
