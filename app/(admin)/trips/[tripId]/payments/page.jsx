import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTripStaffAccess } from "@/lib/trip-access";
import { PaymentForm } from "@/components/trips/payment-form";
import { PaymentsTable } from "@/components/trips/payments-table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TripPaymentsPage({ params }) {
	const { tripId } = await params;
	await requireTripStaffAccess(tripId);

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true, segments: { select: { cost: true } } },
	});
	if (!trip) notFound();

	const payments = await prisma.tripPayment.findMany({
		where: { tripId },
		orderBy: { paymentDate: "desc" },
	});

	const segmentsSubtotal = trip.segments.reduce((sum, s) => sum + (s.cost || 0), 0);
	const paymentsTotal = payments.filter((p) => !p.cancelled).reduce((sum, p) => sum + p.amount, 0);
	const balanceDue = segmentsSubtotal - paymentsTotal;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-end gap-2">
				<p className="text-sm">
					Segments {formatCurrency(segmentsSubtotal)} − Payments {formatCurrency(paymentsTotal)} ={" "}
					<span className={cn("font-medium", balanceDue > 0 && "text-destructive")}>Balance due {formatCurrency(balanceDue)}</span>
				</p>
			</div>

			<PaymentForm tripId={tripId} />
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Payments</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<PaymentsTable
						payments={payments}
						tripId={tripId}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
