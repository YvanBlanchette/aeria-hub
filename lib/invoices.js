export function getInvoicePaidAmount(invoice) {
	const payments = invoice?.trip?.payments;
	if (Array.isArray(payments)) {
		return payments.reduce((sum, payment) => sum + (payment.cancelled ? 0 : payment.amount || 0), 0);
	}

	return invoice?.amountPaid || 0;
}

export function getInvoiceBalance(invoice) {
	return (invoice?.amount || 0) - getInvoicePaidAmount(invoice);
}

export function getInvoiceOutstandingBalance(invoice) {
	return Math.max(getInvoiceBalance(invoice), 0);
}
