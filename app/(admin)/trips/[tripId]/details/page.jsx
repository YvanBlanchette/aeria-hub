import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SegmentFormDialog } from "@/components/trips/segment-form-dialog";
import { SegmentCard } from "@/components/trips/segment-card";
import { ConvertToInvoiceButton } from "@/components/invoices/convert-to-invoice-button";
import { convertItineraryToInvoice } from "@/app/(admin)/invoices/actions";
import { requireTripAccess } from "@/lib/trip-access";

export default async function TripDetailsPage({ params }) {
	const { tripId } = await params;
	const { user, access } = await requireTripAccess(tripId);
	const isStaff = access === "staff";

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true, startDate: true, endDate: true, _count: { select: { invoices: true } } },
	});
	if (!trip) notFound();

	const [segments, suppliers] = await Promise.all([
		prisma.tripSegment.findMany({
			where: { tripId },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: { documents: true, commissions: { orderBy: { createdAt: "asc" } }, supplier: true },
		}),
		isStaff ? prisma.supplier.findMany({ orderBy: { name: "asc" } }) : [],
	]);

	const cruisePortRows = isStaff
		? await prisma.cruisePort.findMany({
				orderBy: [{ name: "asc" }, { country: "asc" }],
				select: { id: true, name: true, displayText: true, country: true },
			})
		: [];
	const cruisePortOptions = cruisePortRows.map((port) => ({ id: port.id, value: port.name, label: port.displayText || port.name }));

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
				<h2 className="text-xl font-semibold tracking-tight text-foreground">Travel segments</h2>
				{isStaff && (
					<div className="flex items-center gap-2">
						{segments.length > 0 && trip._count.invoices === 0 && (
							<ConvertToInvoiceButton
								action={convertItineraryToInvoice.bind(null, tripId)}
								description="Creates a new invoice with one line item per segment, using each segment's title and cost. You can edit the line items afterward."
							/>
						)}
						<SegmentFormDialog
							tripId={tripId}
							suppliers={suppliers}
							cruisePortOptions={cruisePortOptions}
						/>
					</div>
				)}
			</div>

			{segments.length === 0 ? (
				<p className="text-sm text-muted-foreground">No travel elements yet. Add the first one to start building this trip.</p>
			) : (
				<div className="space-y-3">
					{segments.map((segment, index) => (
						<SegmentCard
							key={segment.id}
							segment={segment}
							tripId={tripId}
							suppliers={suppliers}
							cruisePortOptions={cruisePortOptions}
							canMoveUp={isStaff && index > 0}
							canMoveDown={isStaff && index < segments.length - 1}
							canManage={isStaff}
							canClientEdit={user.role === "CLIENT"}
						/>
					))}
				</div>
			)}
		</div>
	);
}
