"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency, initials } from "@/lib/format";
import { PortalAccessToggle } from "@/components/clients/portal-access-toggle";

export function ClientsTable({ clients, spentByClient }) {
	const { t } = useLocale();
	const COLUMNS = [
		{ key: "fullName", label: t("clients.table.name", "Name") },
		{ key: "primaryEmail", label: t("clients.table.email", "Email") },
		{ key: "primaryPhone", label: t("clients.table.phone", "Phone") },
		{ key: "activeBookings", label: t("clients.table.activeBookings", "Active bookings"), align: "right", kind: "number" },
		{ key: "totalSpent", label: t("clients.table.totalSpent", "Total spent"), align: "right", kind: "number" },
		{ key: "status", label: t("clients.table.status", "Status"), align: "right" },
		{ key: "portalAccess", label: "Portal", align: "center" },
	];
	const rows = clients.map((c) => ({
		...c,
		fullName: `${c.firstName} ${c.lastName}`,
		activeBookings: c._count.trips,
		totalSpent: spentByClient[c.id] || 0,
	}));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

	if (rows.length === 0) {
		return (
			<Table>
				<TableBody>
					<TableRow>
						<TableCell className="py-10 text-center text-sm text-muted-foreground">{t("clients.table.empty", "No clients found.")}</TableCell>
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
					<TableHead className="w-10 text-center" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{sorted.map((client) => (
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
									<AvatarFallback className="bg-secondary text-xs">{initials(client.fullName)}</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{client.fullName}</p>
								</div>
							</Link>
						</TableCell>
						<TableCell className="text-muted-foreground">{client.primaryEmail || "—"}</TableCell>
						<TableCell className="text-muted-foreground">{client.primaryPhone || "—"}</TableCell>
						<TableCell className="text-right tabular-nums">{client.activeBookings}</TableCell>
						<TableCell className="text-right tabular-nums">{formatCurrency(client.totalSpent)}</TableCell>
						<TableCell className="text-center w-32">
							<Badge
								variant={client.status === "ACTIVE" ? "default" : "secondary"}
								className="text-[10px] capitalize"
							>
								{client.status === "ACTIVE" ? t("clients.status.active", "active") : t("clients.status.inactive", "inactive")}
							</Badge>
						</TableCell>
						<TableCell className="text-center">
							<PortalAccessToggle
								clientId={client.id}
								enabled={Boolean(client.portalUser?.portalEnabled)}
							/>
						</TableCell>
						<TableCell>
							<DeleteClientButton
								clientId={client.id}
								clientName={client.fullName}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
