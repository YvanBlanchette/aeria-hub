import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/app/(admin)/invoices/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleText } from "@/components/i18n/locale-text";
import { tServer } from "@/lib/i18n-server";
import { getInvoiceBalance, getInvoicePaidAmount } from "@/lib/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { clientScope, invoiceScope, tripScope } from "@/lib/visibility-scope";

const statusVariant = {
	DRAFT: "secondary",
	SENT: "secondary",
	PARTIALLY_PAID: "default",
	PAID: "default",
	OVERDUE: "destructive",
	CANCELLED: "destructive",
};

function statusLabel(status, t) {
	switch (status) {
		case "DRAFT":
			return t("invoices.status.draft", "Draft");
		case "SENT":
			return t("invoices.status.sent", "Sent");
		case "PARTIALLY_PAID":
			return t("invoices.status.partiallyPaid", "Partially paid");
		case "PAID":
			return t("invoices.status.paid", "Paid");
		case "OVERDUE":
			return t("invoices.status.overdue", "Overdue");
		case "CANCELLED":
			return t("invoices.status.cancelled", "Cancelled");
		default:
			return status;
	}
}

export const metadata = {
	title: "Invoices - AERIA Hub",
};

export default async function InvoicesPage() {
	const t = tServer;
	const user = await requireUser();
	const invoicesWhere = invoiceScope(user);
	const clientsWhere = clientScope(user);
	const tripsWhere = tripScope(user);
	const [invoices, clients, trips] = await Promise.all([
		prisma.invoice.findMany({
			where: invoicesWhere,
			orderBy: { issueDate: "desc" },
			include: {
				client: { select: { id: true, firstName: true, lastName: true } },
				trip: { select: { id: true, name: true, payments: { where: { cancelled: false }, select: { amount: true } } } },
			},
		}),
		prisma.client.findMany({
			where: clientsWhere,
			orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
			select: { id: true, firstName: true, lastName: true },
			take: 400,
		}),
		prisma.trip.findMany({
			where: tripsWhere,
			orderBy: { createdAt: "desc" },
			select: { id: true, name: true, clientId: true },
			take: 500,
		}),
	]);

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="space-y-2">
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
						<LocaleText
							messageKey="invoices.hub.kicker"
							fallback="Finance workspace"
						/>
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
						<LocaleText
							messageKey="invoices.title"
							fallback="Invoices"
						/>
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						<LocaleText
							messageKey="invoices.hub.subtitle"
							fallback="Review balances and create draft invoices from a central queue."
						/>
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						<LocaleText
							messageKey="invoices.hub.createTitle"
							fallback="Create invoice"
						/>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						action={createInvoice}
						className="grid grid-cols-1 gap-3 md:grid-cols-4"
					>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="clientId">
								<LocaleText
									messageKey="invoices.form.client"
									fallback="Client"
								/>
							</Label>
							<select
								id="clientId"
								name="clientId"
								required
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="">
									<LocaleText
										messageKey="invoices.form.selectClient"
										fallback="Select a client"
									/>
								</option>
								{clients.map((client) => (
									<option
										key={client.id}
										value={client.id}
									>
										{client.firstName} {client.lastName}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1">
							<Label htmlFor="tripId">
								<LocaleText
									messageKey="invoices.form.tripOptional"
									fallback="Trip (optional)"
								/>
							</Label>
							<select
								id="tripId"
								name="tripId"
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="">
									<LocaleText
										messageKey="invoices.form.noTrip"
										fallback="No trip"
									/>
								</option>
								{trips.map((trip) => (
									<option
										key={trip.id}
										value={trip.id}
									>
										{trip.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1">
							<Label htmlFor="dueDate">
								<LocaleText
									messageKey="invoices.form.dueDate"
									fallback="Due date"
								/>
							</Label>
							<Input
								id="dueDate"
								name="dueDate"
								type="date"
							/>
						</div>
						<div className="flex items-end md:col-span-1 md:col-start-4">
							<Button
								type="submit"
								className="w-full"
							>
								<LocaleText
									messageKey="invoices.form.create"
									fallback="Create invoice"
								/>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{invoices.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-sm text-muted-foreground">
						<LocaleText
							messageKey="invoices.empty"
							fallback="No invoices yet."
						/>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{invoices.map((invoice) => {
						const amountPaid = getInvoicePaidAmount(invoice);
						const balance = getInvoiceBalance(invoice);

						return (
							<Link
								key={invoice.id}
								href={`/invoices/${invoice.id}`}
								className="block"
							>
								<Card className="transition-colors hover:bg-muted/40">
									<CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
										<div>
											<p className="font-medium">{invoice.invoiceNumber}</p>
											<p className="text-sm text-muted-foreground">
												{invoice.client.firstName} {invoice.client.lastName}
												{invoice.trip?.name ? ` · ${invoice.trip.name}` : ""}· {t("invoices.list.issued", "Issued")} {formatDate(invoice.issueDate)}
												{invoice.dueDate ? ` · ${t("invoices.list.due", "Due")} ${formatDate(invoice.dueDate)}` : ""}
											</p>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm tabular-nums text-muted-foreground">
												Paid {formatCurrency(amountPaid)} · Balance {formatCurrency(balance)}
											</span>
											<Badge variant={statusVariant[invoice.status] || "secondary"}>{statusLabel(invoice.status, t)}</Badge>
										</div>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
