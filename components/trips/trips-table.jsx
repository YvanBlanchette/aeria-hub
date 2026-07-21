"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { DeleteTripButton } from "@/components/trips/delete-trip-button";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_VARIANT = {
	INQUIRY: "secondary",
	QUOTED: "secondary",
	BOOKED: "default",
	TRAVELING: "default",
	COMPLETED: "secondary",
	CANCELLED: "destructive",
};

const COLUMNS = [
	{ key: "name", label: "Trip" },
	{ key: "clientName", label: "Client" },
	{ key: "destination", label: "Destination" },
	{ key: "startDate", label: "Dates", kind: "date" },
	{ key: "totalPrice", label: "Total price", align: "right", kind: "number" },
	{ key: "status", label: "Status", align: "right" },
];

export function TripsTable({ trips }) {
	const rows = trips.map((t) => ({ ...t, clientName: `${t.client.firstName} ${t.client.lastName}` }));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

	if (rows.length === 0) {
		return (
			<Table>
				<TableBody>
					<TableRow>
						<TableCell className="py-10 text-center text-sm text-muted-foreground">No trips found.</TableCell>
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
								<p className="text-xs text-muted-foreground">Trip workspace</p>
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
						<TableCell className="text-muted-foreground">
							{trip.startDate ? formatDate(trip.startDate) : "—"}
							{trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}
						</TableCell>
						<TableCell className="text-right tabular-nums">{trip.totalPrice != null ? formatCurrency(trip.totalPrice) : "—"}</TableCell>
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
