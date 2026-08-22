"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_VARIANT = {
	INQUIRY: "secondary",
	QUOTED: "secondary",
	BOOKED: "default",
	TRAVELING: "default",
	COMPLETED: "secondary",
	CANCELLED: "destructive",
};

export function TripsTable({ trips }) {
	const { t } = useLocale();
	const COLUMNS = [
		{ key: "name", label: t("trips.table.trip", "Trip") },
		{ key: "clientName", label: t("trips.table.client", "Client") },
		{ key: "destination", label: t("trips.table.destination", "Destination") },
		{ key: "startDate", label: t("trips.table.departure", "Departure date"), kind: "date" },
		{ key: "endDate", label: t("trips.table.return", "Return date"), kind: "date" },
		{ key: "totalPrice", label: t("trips.table.totalPrice", "Total price"), align: "right", kind: "number" },
		{ key: "readiness", label: t("trips.table.readiness", "Readiness") },
		{ key: "status", label: t("trips.table.status", "Status"), align: "right" },
	];
	const rows = trips.map((t) => ({ ...t, clientName: `${t.client.firstName} ${t.client.lastName}`, readiness: t.segments?.length || 0 }));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

	if (rows.length === 0) {
		return (
			<Table>
				<TableBody>
					<TableRow>
						<TableCell className="py-10 text-center text-sm text-muted-foreground">{t("trips.table.empty", "No trips found.")}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{COLUMNS.map((col) => (
						<SortableTableHead
							key={col.key}
							col={col}
							sortKey={sortKey}
							sortDir={sortDir}
							onToggle={toggleSort}
						/>
					))}
					<TableHead className="w-10" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{sorted.map((trip) => (
					<TableRow
						key={trip.id}
						className="bg-card/60"
					>
						<TableCell>
							<Link
								href={`/trips/${trip.id}`}
								className="block hover:underline"
							>
								<p className="font-medium">{trip.name}</p>
								<p className="text-xs text-muted-foreground">{t("trips.table.workspace", "Trip workspace")}</p>
							</Link>
						</TableCell>
						<TableCell>
							<Link
								href={`/clients/${trip.client.id}`}
								className="text-muted-foreground hover:underline"
							>
								{trip.clientName}
							</Link>
						</TableCell>
						<TableCell className="text-muted-foreground">{trip.destination}</TableCell>
						<TableCell className="text-muted-foreground">{trip.startDate ? formatDate(trip.startDate) : "—"}</TableCell>
						<TableCell className="text-muted-foreground">{trip.endDate ? formatDate(trip.endDate) : "—"}</TableCell>
						<TableCell className="text-right tabular-nums">{trip.totalPrice != null ? formatCurrency(trip.totalPrice) : "—"}</TableCell>
						<TableCell>
							<div className="flex flex-wrap gap-1">
								<Badge variant={trip.segments?.length ? "secondary" : "outline"}>{trip.segments?.length || 0} elements</Badge>
								{(() => {
									const outstanding = (trip.invoices || []).reduce((sum, invoice) => sum + Math.max((invoice.amount || 0) - (invoice.amountPaid || 0), 0), 0);
									const overdueTasks = (trip.tasks || []).filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < new Date()).length;
									return (
										<>
											<Badge variant={outstanding > 0 ? "destructive" : "secondary"}>{outstanding > 0 ? "Balance due" : "Paid"}</Badge>
											{overdueTasks > 0 && <Badge variant="destructive">{overdueTasks} overdue</Badge>}
										</>
									);
								})()}
							</div>
						</TableCell>
						<TableCell className="text-right">
							<Badge variant={STATUS_VARIANT[trip.status] || "secondary"}>{trip.status}</Badge>
						</TableCell>
						<TableCell>
							<DeleteTripButton
								tripId={trip.id}
								clientId={trip.client.id}
								tripName={trip.name}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
