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
import { createSupplier, updateSupplier } from "@/app/(admin)/suppliers/actions";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers";

export function SupplierFormDialog({ supplier, trigger }) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState(supplier?.category || "OTHER");
	const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier;
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
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setCategory(supplier?.category || "OTHER");
			}}
		>
			<DialogTrigger asChild>
				{trigger || (
					<Button>
						<Plus className="size-4" />
						{t("suppliers.form.new", "New supplier")}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{supplier ? t("suppliers.form.edit", "Edit supplier") : t("suppliers.form.new", "New supplier")}</DialogTitle>
				</DialogHeader>
				<form
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="name">{t("suppliers.form.name", "Name")}</Label>
						<Input
							id="name"
							name="name"
							placeholder={t("suppliers.form.namePlaceholder", "Air Canada, Royal Caribbean, Exoticca...")}
							defaultValue={supplier?.name}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="category">{t("suppliers.form.category", "Category")}</Label>
						<Select
							name="category"
							value={category}
							onValueChange={setCategory}
						>
							<SelectTrigger
								id="category"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SUPPLIER_CATEGORIES.map((c) => {
									const Icon = c.icon;
									return (
										<SelectItem
											key={c.value}
											value={c.value}
										>
											<Icon className="size-4" />
											{c.label}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>

					{category === "CRUISE" && (
						<div className="space-y-2">
							<Label htmlFor="excursionsLineCode">Shore Excursions Group line code</Label>
							<Input
								id="excursionsLineCode"
								name="excursionsLineCode"
								placeholder="50"
								defaultValue={supplier?.excursionsLineCode ?? ""}
							/>
							<p className="text-xs text-muted-foreground">Powers the "Book your excursions" affiliate link in the itinerary.</p>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="phone">{t("suppliers.form.phone", "Phone")}</Label>
							<Input
								id="phone"
								name="phone"
								type="tel"
								defaultValue={supplier?.phone ?? ""}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="website">{t("suppliers.form.publicWebsite", "Public website")}</Label>
							<Input
								id="website"
								name="website"
								type="url"
								placeholder={t("suppliers.form.urlPlaceholder", "https://...")}
								defaultValue={supplier?.website ?? ""}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="agentPortalUrl">{t("suppliers.form.agentPlatformUrl", "Agent platform URL")}</Label>
							<Input
								id="agentPortalUrl"
								name="agentPortalUrl"
								type="url"
								placeholder={t("suppliers.form.agentUrlPlaceholder", "https://agent.example.com...")}
								defaultValue={supplier?.agentPortalUrl ?? ""}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">{t("suppliers.form.notes", "Notes")}</Label>
						<Textarea
							id="notes"
							name="notes"
							rows={3}
							defaultValue={supplier?.notes ?? ""}
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
							{pending
								? t("suppliers.form.saving", "Saving...")
								: supplier
									? t("suppliers.form.saveChanges", "Save changes")
									: t("suppliers.form.create", "Create supplier")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
