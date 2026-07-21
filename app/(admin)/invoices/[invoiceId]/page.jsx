import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceEditDialog } from "@/components/invoices/invoice-edit-dialog";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { InvoiceLineItemFormDialog } from "@/components/invoices/invoice-line-item-form-dialog";
import { InvoiceLineItemsTable } from "@/components/invoices/invoice-line-items-table";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_VARIANT = {
	DRAFT: "secondary",
	SENT: "secondary",
	PARTIALLY_PAID: "default",
	PAID: "default",
	OVERDUE: "destructive",
	CANCELLED: "destructive",
};

export default async function InvoiceDetailPage({ params }) {
	const { invoiceId } = await params;

	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: {
			client: { select: { id: true, firstName: true, lastName: true } },
			trip: { select: { id: true, name: true } },
			lineItems: { orderBy: { sortOrder: "asc" } },
		},
	});
	if (!invoice) notFound();

	const balance = invoice.amount - invoice.amountPaid;

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Invoice record</p>
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">{invoice.invoiceNumber}</h1>
							<Badge variant={STATUS_VARIANT[invoice.status] || "secondary"}>{invoice.status}</Badge>
						</div>
						<p className="text-sm leading-6 text-muted-foreground">
							<Link
								href={`/clients/${invoice.client.id}`}
								className="hover:underline"
							>
								{invoice.client.firstName} {invoice.client.lastName}
							</Link>
							{invoice.trip && (
								<>
									{" · "}
									<Link
										href={`/trips/${invoice.trip.id}/overview`}
										className="hover:underline"
									>
										{invoice.trip.name}
									</Link>
								</>
							)}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							asChild
						>
							<a
								href={`/api/invoices/${invoice.id}/pdf`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Download className="size-4" />
								Download PDF
							</a>
						</Button>
						<InvoiceEditDialog
							invoice={invoice}
							trigger={
								<Button variant="outline">
									<Pencil className="size-4" />
									Edit
								</Button>
							}
						/>
						<DeleteInvoiceButton
							invoiceId={invoice.id}
							clientId={invoice.client.id}
							invoiceNumber={invoice.invoiceNumber}
						/>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Financial summary</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
					<div>
						<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issued</dt>
						<dd className="mt-0.5 text-sm">{formatDate(invoice.issueDate)}</dd>
					</div>
					<div>
						<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due</dt>
						<dd className="mt-0.5 text-sm">{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</dd>
					</div>
					<div>
						<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid</dt>
						<dd className="mt-0.5 text-sm">{formatCurrency(invoice.amountPaid)}</dd>
					</div>
					<div>
						<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance</dt>
						<dd className={cn("mt-0.5 text-sm font-medium", balance > 0 && "text-destructive")}>{formatCurrency(balance)}</dd>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle>Line items</CardTitle>
					<InvoiceLineItemFormDialog invoiceId={invoice.id} />
				</CardHeader>
				<CardContent className="space-y-3">
					{invoice.lineItems.length === 0 ? (
						<p className="text-sm text-muted-foreground">No line items yet.</p>
					) : (
						<InvoiceLineItemsTable
							lineItems={invoice.lineItems}
							invoiceId={invoice.id}
						/>
					)}

					<div className="flex justify-end border-t border-border pt-3">
						<p className="text-sm font-medium">Total: {formatCurrency(invoice.amount)}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
