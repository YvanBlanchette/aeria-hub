import { parseCsv, rowsToObjects, toCsv } from "@/lib/csv";

export const TRIP_CSV_HEADERS = ["name", "destination", "clientEmail", "startDate", "endDate", "status", "totalPrice", "finalPaymentDate"];

export function parseTripCsv(text) {
	return rowsToObjects(parseCsv(text)).map((row) => ({
		name: row.name?.trim(),
		destination: row.destination?.trim(),
		clientEmail: row.clientEmail?.trim().toLowerCase(),
		startDate: row.startDate?.trim(),
		endDate: row.endDate?.trim(),
		status: row.status?.trim().toUpperCase() || "INQUIRY",
		totalPrice: row.totalPrice?.trim(),
		finalPaymentDate: row.finalPaymentDate?.trim(),
	}));
}

export function tripsToCsv(trips) {
	return toCsv(
		TRIP_CSV_HEADERS,
		trips.map((trip) => ({
			name: trip.name,
			destination: trip.destination,
			clientEmail: trip.client?.primaryEmail || "",
			startDate: trip.startDate?.toISOString().slice(0, 10) || "",
			endDate: trip.endDate?.toISOString().slice(0, 10) || "",
			status: trip.status,
			totalPrice: trip.totalPrice == null ? "" : (trip.totalPrice / 100).toFixed(2),
			finalPaymentDate: trip.finalPaymentDate?.toISOString().slice(0, 10) || "",
		})),
	);
}
