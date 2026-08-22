"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createInvoiceLineItem, updateInvoiceLineItem } from "@/app/(admin)/invoices/actions";
import { centsToDollarsInputValue } from "@/lib/format";
import { useLocale } from "@/components/i18n/locale-provider";

export function InvoiceLineItemFormDialog({ invoiceId, lineItem, trigger }) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const action = lineItem ? updateInvoiceLineItem.bind(null, lineItem.id, invoiceId) : createInvoiceLineItem.bind(null, invoiceId);
	const [error, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);
	const formRef = useRef(null);

	useEffect(() => {
		if (wasPending.current && !pending && !error) {
			setOpen(false);
			formRef.current?.reset();
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
					<Button
						variant="outline"
						size="sm"
						className="text-[#12202b]! [&_svg]:text-[#12202b]!"
					>
						<Plus className="size-4" />
						{t("invoices.lineItems.add", "Add line item")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{lineItem ? t("invoices.lineItems.edit", "Edit line item") : t("invoices.lineItems.add", "Add line item")}</DialogTitle>
				</DialogHeader>
				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="description">{t("invoices.lineItems.description", "Description")}</Label>
						<Input
							id="description"
							name="description"
							defaultValue={lineItem?.description}
							placeholder={t("invoices.lineItems.descriptionPlaceholder", "Flight (2 pax), 7-night cruise, travel insurance...")}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="quantity">{t("invoices.lineItems.quantity", "Quantity")}</Label>
							<Input
								id="quantity"
								name="quantity"
								type="number"
								step="1"
								min="1"
								defaultValue={lineItem?.quantity ?? 1}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="unitPrice">{t("invoices.lineItems.unitPrice", "Unit price")}</Label>
							<Input
								id="unitPrice"
								name="unitPrice"
								type="number"
								step="0.01"
								min="0"
								defaultValue={centsToDollarsInputValue(lineItem?.unitPrice)}
								required
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
							{pending
								? t("invoices.form.saving", "Saving...")
								: lineItem
									? t("invoices.form.saveChanges", "Save changes")
									: t("invoices.lineItems.add", "Add line item")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
