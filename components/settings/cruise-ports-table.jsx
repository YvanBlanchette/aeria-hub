"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CruisePortFormDialog } from "@/components/settings/cruise-port-form-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteCruisePort } from "@/app/(admin)/settings/cruise-catalog/actions";

export function CruisePortsTable({ ports }) {
	if (ports.length === 0) {
		return <p className="p-6 text-sm text-muted-foreground">No cruise ports found.</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Country</TableHead>
					<TableHead>Locode</TableHead>
					<TableHead className="w-24 text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{ports.map((port) => (
					<TableRow key={port.id}>
						<TableCell className="font-medium">{port.name}</TableCell>
						<TableCell className="text-muted-foreground">{port.country || "—"}</TableCell>
						<TableCell className="text-muted-foreground">{port.locode || "—"}</TableCell>
						<TableCell>
							<div className="flex items-center justify-end gap-1">
								<CruisePortFormDialog port={port} />
								<ConfirmDeleteButton
									itemLabel={port.name}
									onConfirm={() => deleteCruisePort(port.id)}
								/>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
