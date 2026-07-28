"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocale } from "@/components/i18n/locale-provider";
import { createQuote, updateQuote } from "@/app/(admin)/trips/[tripId]/quotes/actions";

export function QuoteFormDialog({ tripId, quote, trigger }) {
	const { t } = useLocale();
	const quoteStatuses = [
		{ value: "DRAFT", label: t("quotes.status.draft", "Draft") },
		{ value: "SENT", label: t("quotes.status.sent", "Sent") },
		{ value: "ACCEPTED", label: t("quotes.status.accepted", "Accepted") },
		{ value: "DECLINED", label: t("quotes.status.declined", "Declined") },
		{ value: "EXPIRED", label: t("quotes.status.expired", "Expired") },
	];
	const [open, setOpen] = useState(false);
	const action = quote ? updateQuote.bind(null, quote.id) : createQuote.bind(null, tripId);
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
					<Button size="sm">
						<Plus className="size-4" />
						{t("quotes.new", "New quote")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{quote ? t("quotes.edit", "Edit quote") : t("quotes.new", "New quote")}</DialogTitle>
				</DialogHeader>
				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="title">{t("quotes.form.title", "Title")}</Label>
						<Input
							id="title"
							name="title"
							defaultValue={quote?.title}
							placeholder={t("quotes.form.titlePlaceholder", "Caribbean cruise package, Option A...")}
							required
						/>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="validUntil">{t("quotes.form.validUntil", "Valid until")}</Label>
							<Input
								id="validUntil"
								name="validUntil"
								type="date"
								defaultValue={quote?.validUntil ? new Date(quote.validUntil).toISOString().slice(0, 10) : ""}
							/>
						</div>
						{quote && (
							<div className="space-y-2">
								<Label htmlFor="status">{t("quotes.form.status", "Status")}</Label>
								<Select
									name="status"
									defaultValue={quote.status}
								>
									<SelectTrigger
										id="status"
										className="w-full"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{quoteStatuses.map((s) => (
											<SelectItem
												key={s.value}
												value={s.value}
											>
												{s.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="notes">{t("quotes.form.notes", "Notes")}</Label>
						<Textarea
							id="notes"
							name="notes"
							rows={2}
							defaultValue={quote?.notes ?? ""}
						/>
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
							{pending ? t("quotes.form.saving", "Saving...") : quote ? t("quotes.form.saveChanges", "Save changes") : t("quotes.form.create", "Create quote")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
