"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocale } from "@/components/i18n/locale-provider";
import { createLineItem, updateLineItem } from "@/app/(admin)/trips/[tripId]/quotes/actions";
import { centsToDollarsInputValue } from "@/lib/format";

export function LineItemFormDialog({ quoteId, lineItem, trigger }) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const action = lineItem ? updateLineItem.bind(null, lineItem.id, quoteId) : createLineItem.bind(null, quoteId);
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
					>
						<Plus className="size-4" />
						{t("quotes.lineItems.add", "Add line item")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{lineItem ? t("quotes.lineItems.edit", "Edit line item") : t("quotes.lineItems.add", "Add line item")}</DialogTitle>
				</DialogHeader>
				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="description">{t("quotes.lineItems.description", "Description")}</Label>
						<Input
							id="description"
							name="description"
							defaultValue={lineItem?.description}
							placeholder={t("quotes.lineItems.descriptionPlaceholder", "Flight (2 pax), 7-night cruise, travel insurance...")}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="quantity">{t("quotes.lineItems.quantity", "Quantity")}</Label>
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
							<Label htmlFor="unitPrice">{t("quotes.lineItems.unitPrice", "Unit price")}</Label>
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
								? t("quotes.form.saving", "Saving...")
								: lineItem
									? t("quotes.form.saveChanges", "Save changes")
									: t("quotes.lineItems.add", "Add line item")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
