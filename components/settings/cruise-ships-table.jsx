"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CruiseShipFormDialog } from "@/components/settings/cruise-ship-form-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteCruiseShip } from "@/app/(admin)/settings/cruise-catalog/actions";

export function CruiseShipsTable({ ships, cruiseLines }) {
	if (ships.length === 0) {
		return <p className="p-6 text-sm text-muted-foreground">No cruise ships found.</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Cruise line</TableHead>
					<TableHead className="w-24 text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{ships.map((ship) => (
					<TableRow key={ship.id}>
						<TableCell className="font-medium">{ship.name}</TableCell>
						<TableCell className="text-muted-foreground">{ship.supplier?.name || "—"}</TableCell>
						<TableCell>
							<div className="flex items-center justify-end gap-1">
								<CruiseShipFormDialog
									ship={ship}
									cruiseLines={cruiseLines}
								/>
								<ConfirmDeleteButton
									itemLabel={ship.name}
									onConfirm={() => deleteCruiseShip(ship.id)}
								/>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
