"use client";

import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { QuoteFormDialog } from "@/components/trips/quote-form-dialog";
import { DeleteQuoteButton } from "@/components/trips/delete-quote-button";
import { LineItemFormDialog } from "@/components/trips/line-item-form-dialog";
import { DeleteLineItemButton } from "@/components/trips/delete-line-item-button";
import { ConvertToInvoiceButton } from "@/components/invoices/convert-to-invoice-button";
import { convertQuoteToInvoice } from "@/app/(admin)/invoices/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_VARIANT = {
	DRAFT: "secondary",
	SENT: "outline",
	ACCEPTED: "default",
	DECLINED: "destructive",
	EXPIRED: "secondary",
};

export function QuoteCard({ quote, tripId }) {
	const { t } = useLocale();
	const lineItemColumns = [
		{ key: "description", label: t("quotes.lineItems.description", "Description") },
		{ key: "quantity", label: t("quotes.lineItems.qtyShort", "Qty"), align: "right", kind: "number" },
		{ key: "unitPrice", label: t("quotes.lineItems.unitPrice", "Unit price"), align: "right", kind: "number" },
		{ key: "lineTotal", label: t("quotes.totalLabel", "Total"), align: "right", kind: "number" },
	];
	const total = quote.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
	const lineItemRows = quote.lineItems.map((li) => ({ ...li, lineTotal: li.quantity * li.unitPrice }));
	const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(lineItemRows, lineItemColumns);
	const validUntil = t("quotes.validUntil", "Valid until {date}").replace("{date}", formatDate(quote.validUntil));
	const convertDescription = t(
		"quotes.convertToInvoiceDescription",
		'Creates a new invoice copying the line items from "{title}". You can edit them afterward.',
	).replace("{title}", quote.title);

	return (
		<Card>
			<CardContent className="space-y-4 p-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<p className="font-medium">{quote.title}</p>
							<Badge variant={STATUS_VARIANT[quote.status] || "secondary"}>{quote.status}</Badge>
						</div>
						{quote.validUntil && <p className="text-sm text-muted-foreground">{validUntil}</p>}
					</div>
					<div className="flex items-center gap-1">
						{quote.lineItems.length > 0 && (
							<ConvertToInvoiceButton
								action={convertQuoteToInvoice.bind(null, quote.id)}
								label={t("quotes.convertToInvoice", "Invoice")}
								description={convertDescription}
							/>
						)}
						<QuoteFormDialog
							tripId={tripId}
							quote={quote}
							trigger={
								<Button
									variant="ghost"
									size="icon-sm"
								>
									<Pencil className="size-4" />
									<span className="sr-only">{t("quotes.editSr", "Edit {value}").replace("{value}", quote.title)}</span>
								</Button>
							}
						/>
						<DeleteQuoteButton
							quoteId={quote.id}
							tripId={tripId}
							quoteTitle={quote.title}
						/>
					</div>
				</div>

				{quote.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>}

				{quote.lineItems.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t("quotes.noLineItems", "No line items yet.")}</p>
				) : (
					<div className="overflow-hidden rounded-lg border border-border">
						<Table>
							<TableHeader>
								<TableRow>
									{lineItemColumns.map((col) => (
										<SortableTableHead
											key={col.key}
											col={col}
											sortKey={sortKey}
											sortDir={sortDir}
											onToggle={toggleSort}
										/>
									))}
									<TableHead className="w-20 text-right">{t("quotes.actions", "Actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sorted.map((li) => (
									<TableRow key={li.id}>
										<TableCell className="font-medium">{li.description}</TableCell>
										<TableCell className="text-right">{li.quantity}</TableCell>
										<TableCell className="text-right">{formatCurrency(li.unitPrice)}</TableCell>
										<TableCell className="text-right">{formatCurrency(li.quantity * li.unitPrice)}</TableCell>
										<TableCell>
											<div className="flex justify-end gap-1">
												<LineItemFormDialog
													quoteId={quote.id}
													lineItem={li}
													trigger={
														<Button
															variant="ghost"
															size="icon-sm"
														>
															<Pencil className="size-4" />
															<span className="sr-only">{t("quotes.editSr", "Edit {value}").replace("{value}", li.description)}</span>
														</Button>
													}
												/>
												<DeleteLineItemButton
													lineItemId={li.id}
													quoteId={quote.id}
													itemLabel={li.description}
												/>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				<div className="flex items-center justify-between">
					<LineItemFormDialog quoteId={quote.id} />
					<p className="text-sm font-medium">{t("quotes.total", "Total: {amount}").replace("{amount}", formatCurrency(total))}</p>
				</div>
			</CardContent>
		</Card>
	);
}
