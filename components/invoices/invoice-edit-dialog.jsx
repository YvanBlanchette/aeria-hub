"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateInvoice } from "@/app/(admin)/invoices/actions";
import { useLocale } from "@/components/i18n/locale-provider";

const STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

function dateInputValue(date) {
	if (!date) return "";
	return new Date(date).toISOString().slice(0, 10);
}

export function InvoiceEditDialog({ invoice, trigger }) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const action = updateInvoice.bind(null, invoice.id);
	const [error, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);

	useEffect(() => {
		if (wasPending.current && !pending && !error) {
			setOpen(false);
		}
		wasPending.current = pending;
	}, [pending, error]);

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline">
						<Pencil className="size-4" />
						{t("invoices.detail.edit", "Edit")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("invoices.form.edit", "Edit invoice")}</DialogTitle>
				</DialogHeader>
				<form
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="invoiceNumber">{t("invoices.form.invoiceNumber", "Invoice title")}</Label>
						<Input
							id="invoiceNumber"
							name="invoiceNumber"
							defaultValue={invoice.invoiceNumber}
							required
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="status">{t("invoices.form.status", "Status")}</Label>
							<Select
								name="status"
								defaultValue={invoice.status}
							>
								<SelectTrigger
									id="status"
									className="w-full"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUSES.map((s) => (
										<SelectItem
											key={s}
											value={s}
										>
											{s === "DRAFT"
												? t("invoices.status.draft", "Draft")
												: s === "SENT"
													? t("invoices.status.sent", "Sent")
													: s === "PARTIALLY_PAID"
														? t("invoices.status.partiallyPaid", "Partially paid")
														: s === "PAID"
															? t("invoices.status.paid", "Paid")
															: s === "OVERDUE"
																? t("invoices.status.overdue", "Overdue")
																: t("invoices.status.cancelled", "Cancelled")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="dueDate">{t("invoices.form.dueDate", "Due date")}</Label>
							<Input
								id="dueDate"
								name="dueDate"
								type="date"
								defaultValue={dateInputValue(invoice.dueDate)}
							/>
						</div>
					</div>

					{error && (
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{error}
						</p>
					)}

					<DialogFooter>
						<Button
							type="submit"
							disabled={pending}
						>
							{pending ? t("invoices.form.saving", "Saving...") : t("invoices.form.saveChanges", "Save changes")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
