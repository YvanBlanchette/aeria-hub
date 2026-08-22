import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTripStaffAccess } from "@/lib/trip-access";
import { getInvoiceBalance, getInvoicePaidAmount } from "@/lib/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT = {
	DRAFT: "secondary",
	SENT: "secondary",
	PARTIALLY_PAID: "default",
	PAID: "default",
	OVERDUE: "destructive",
	CANCELLED: "destructive",
};

export default async function TripInvoicesPage({ params }) {
	const { tripId } = await params;
	await requireTripStaffAccess(tripId);

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: {
			id: true,
			invoices: {
				orderBy: { issueDate: "desc" },
				include: { trip: { select: { payments: { where: { cancelled: false }, select: { amount: true } } } } },
			},
		},
	});
	if (!trip) notFound();

	return (
		<Card className="p-0">
			<CardHeader>
				<CardTitle>Invoices</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{trip.invoices.length === 0 ? (
					<p className="p-4 text-sm text-muted-foreground">No invoices for this trip yet.</p>
				) : (
					<div className="divide-y divide-border">
						{trip.invoices.map((invoice) => {
							const amountPaid = getInvoicePaidAmount(invoice);
							const balance = getInvoiceBalance(invoice);

							return (
								<Link
									key={invoice.id}
									href={`/invoices/${invoice.id}`}
									className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/35"
								>
									<div className="flex min-w-0 items-center gap-3">
										<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
											<Receipt className="size-4" />
										</div>
										<div className="min-w-0">
											<p className="font-medium">{invoice.invoiceNumber}</p>
											<p className="text-sm text-muted-foreground">
												Issued {formatDate(invoice.issueDate)}
												{invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3 text-sm tabular-nums">
										<span className="text-muted-foreground">Paid {formatCurrency(amountPaid)}</span>
										<span className={balance > 0 ? "font-medium text-destructive" : "font-medium"}>Balance {formatCurrency(balance)}</span>
										<Badge variant={STATUS_VARIANT[invoice.status] || "secondary"}>{invoice.status}</Badge>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
