import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_VARIANT = {
	INQUIRY: "secondary",
	QUOTED: "secondary",
	BOOKED: "default",
	TRAVELING: "default",
	COMPLETED: "secondary",
	CANCELLED: "destructive",
};

export function ClientTripsTable({ trips }) {
	if (trips.length === 0) {
		return (
			<Table>
				<TableBody>
					<TableRow>
						<TableCell className="py-10 text-center text-sm text-muted-foreground">No trips are currently associated with your account.</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Trip</TableHead>
					<TableHead>Destination</TableHead>
					<TableHead>Departure date</TableHead>
					<TableHead>Return date</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Trip total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{trips.map((trip) => (
					<TableRow
						key={trip.id}
						className="bg-card/60"
					>
						<TableCell>
							<Link
								href={`/trips/${trip.id}/overview`}
								className="block font-medium hover:underline"
							>
								{trip.name}
							</Link>
						</TableCell>
						<TableCell className="text-muted-foreground">{trip.destination || "—"}</TableCell>
						<TableCell className="text-muted-foreground">{trip.startDate ? formatDate(trip.startDate) : "—"}</TableCell>
						<TableCell className="text-muted-foreground">{trip.endDate ? formatDate(trip.endDate) : "—"}</TableCell>
						<TableCell>
							<Badge variant={STATUS_VARIANT[trip.status] || "secondary"}>{trip.status}</Badge>
						</TableCell>
						<TableCell className="text-right tabular-nums">{trip.totalPrice != null ? formatCurrency(trip.totalPrice) : "—"}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
