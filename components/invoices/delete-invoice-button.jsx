"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteInvoice } from "@/app/(admin)/invoices/actions";
import { useLocale } from "@/components/i18n/locale-provider";

export function DeleteInvoiceButton({ invoiceId, clientId, invoiceNumber }) {
	const { t } = useLocale();
	return (
		<ConfirmDeleteButton
			itemLabel={invoiceNumber}
			description={t("invoices.delete.description", "This permanently removes the invoice and its line items.")}
			onConfirm={() => deleteInvoice(invoiceId, clientId)}
		/>
	);
}
