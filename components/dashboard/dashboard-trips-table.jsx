"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";

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
	{ key: "status", label: "Status", align: "right" },
];

export function DashboardTripsTable({ trips }) {
	const rows = trips.map((t) => ({ ...t, clientName: `${t.client.firstName} ${t.client.lastName}` }));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

	if (rows.length === 0) {
		return <p className="p-4 text-sm text-muted-foreground">No trips yet.</p>;
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
						<TableCell className="text-muted-foreground">
							<Link
								href={`/clients/${trip.client.id}`}
								className="hover:underline"
							>
								{trip.clientName}
							</Link>
						</TableCell>
						<TableCell className="text-right">
							<Badge variant={STATUS_VARIANT[trip.status] || "secondary"}>{trip.status}</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
