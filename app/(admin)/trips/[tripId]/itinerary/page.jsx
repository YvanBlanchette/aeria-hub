import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SegmentFormDialog } from "@/components/trips/segment-form-dialog";
import { SegmentCard } from "@/components/trips/segment-card";
import { ImportCruiseItineraryDialog } from "@/components/trips/import-cruise-itinerary-dialog";
import { ConvertToInvoiceButton } from "@/components/invoices/convert-to-invoice-button";
import { convertItineraryToInvoice } from "@/app/(admin)/invoices/actions";
import { requireTripStaffAccess } from "@/lib/trip-access";

export default async function ItineraryPage({ params }) {
	const { tripId } = await params;
	await requireTripStaffAccess(tripId);

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true, startDate: true, endDate: true },
	});
	if (!trip) notFound();

	const [segments, suppliers] = await Promise.all([
		prisma.tripSegment.findMany({
			where: { tripId },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: { documents: true, commissions: { orderBy: { createdAt: "asc" } }, supplier: true },
		}),
		prisma.supplier.findMany({ orderBy: { name: "asc" } }),
	]);

	const scrapedRows = await prisma.scrapedCruiseItinerary.findMany({
		orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
		take: 1000,
		select: {
			id: true,
			shipName: true,
			title: true,
			startDate: true,
			shipId: true,
		},
	});

	const scrapedItineraries = scrapedRows.map((row) => ({
		id: row.id,
		label: `${row.shipName}${row.title ? ` | ${row.title}` : ""} | ${row.startDate ? row.startDate.toISOString().slice(0, 10) : "?"}${row.shipId ? ` | #${row.shipId}` : ""}`,
	}));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Travel elements</h2>
					<p className="text-sm text-muted-foreground">
						Build the trip from flights, hotels, cruises, transfers, excursions, and other travel elements. Dates can be added now or when the itinerary is
						ready to generate.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ImportCruiseItineraryDialog
						tripId={tripId}
						itineraries={scrapedItineraries}
					/>
					{segments.length > 0 && (
						<ConvertToInvoiceButton
							action={convertItineraryToInvoice.bind(null, tripId)}
							description="Creates a new invoice with one line item per segment, using each segment's title and cost. You can edit the line items afterward."
						/>
					)}
					<SegmentFormDialog
						tripId={tripId}
						suppliers={suppliers}
					/>
				</div>
			</div>

			{segments.length === 0 ? (
				<p className="text-sm text-muted-foreground">No travel elements yet. Add the first one to start building this trip.</p>
			) : (
				<div className="space-y-3">
					<div className="flex items-center justify-between border-b border-border pb-2">
						<h3 className="text-sm font-semibold text-foreground">Travel elements</h3>
						<p className="text-xs text-muted-foreground">
							{segments.length} item{segments.length === 1 ? "" : "s"} · ordered for itinerary generation
						</p>
					</div>
					{segments.map((segment, index) => (
						<SegmentCard
							key={segment.id}
							segment={segment}
							tripId={tripId}
							suppliers={suppliers}
							canMoveUp={index > 0}
							canMoveDown={index < segments.length - 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}
