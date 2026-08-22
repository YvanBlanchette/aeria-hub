"use client";

import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";
import { useLocale } from "@/components/i18n/locale-provider";

export function SupplierSegmentsTable({ segments }) {
	const { t } = useLocale();
	const COLUMNS = [
		{ key: "title", label: t("suppliers.segments.segment", "Segment") },
		{ key: "typeLabel", label: t("suppliers.segments.type", "Type") },
		{ key: "tripName", label: t("suppliers.segments.trip", "Trip") },
		{ key: "clientName", label: t("suppliers.segments.client", "Client") },
		{ key: "startDateTime", label: t("suppliers.segments.date", "Date"), kind: "date" },
		{ key: "cost", label: t("suppliers.segments.cost", "Cost"), align: "right", kind: "number" },
	];
	const router = useRouter();
	const rows = segments.map((s) => ({
		...s,
		typeLabel: SEGMENT_TYPE_MAP[s.type]?.label || s.type,
		tripName: s.trip.name,
		clientName: `${s.trip.client.firstName} ${s.trip.client.lastName}`,
	}));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS, { defaultKey: "startDateTime" });

	if (rows.length === 0) {
		return <p className="text-sm text-muted-foreground">{t("suppliers.segments.empty", "No segments booked through this supplier yet.")}</p>;
	}

	return (
		<div className="overflow-hidden rounded-lg border border-border">
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
					{sorted.map((segment) => (
						<TableRow
							key={segment.id}
							className="cursor-pointer bg-card hover:bg-muted/40"
							onClick={() => router.push(`/trips/${segment.trip.id}/details`)}
						>
							<TableCell className="font-medium">{segment.title}</TableCell>
							<TableCell className="text-muted-foreground">{segment.typeLabel}</TableCell>
							<TableCell className="text-muted-foreground">{segment.tripName}</TableCell>
							<TableCell className="text-muted-foreground">{segment.clientName}</TableCell>
							<TableCell className="text-muted-foreground">{segment.startDateTime ? formatDate(segment.startDateTime) : "—"}</TableCell>
							<TableCell className="text-right tabular-nums">{segment.cost != null ? formatCurrency(segment.cost) : "—"}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
