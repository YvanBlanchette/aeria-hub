"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TripFilters({ defaultQuery, defaultStatus }) {
	const { t } = useLocale();
	const STATUSES = [
		{ value: "all", label: t("trips.filters.allStatuses", "All statuses") },
		{ value: "INQUIRY", label: t("trips.status.inquiry", "Inquiry") },
		{ value: "QUOTED", label: t("trips.status.quoted", "Quoted") },
		{ value: "BOOKED", label: t("trips.status.booked", "Booked") },
		{ value: "TRAVELING", label: t("trips.status.traveling", "Traveling") },
		{ value: "COMPLETED", label: t("trips.status.completed", "Completed") },
		{ value: "CANCELLED", label: t("trips.status.cancelled", "Cancelled") },
	];
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	function updateParam(key, value) {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set(key, value);
		else params.delete(key);
		params.delete("page");
		router.push(`${pathname}?${params.toString()}`);
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					updateParam("q", new FormData(event.currentTarget).get("q"));
				}}
				className="relative max-w-sm flex-1"
			>
				<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					name="q"
					defaultValue={defaultQuery}
					placeholder={t("trips.filters.searchPlaceholder", "Search by name or destination...")}
					className="pl-8"
				/>
			</form>

			<Select
				value={defaultStatus || "all"}
				onValueChange={(value) => updateParam("status", value === "all" ? "" : value)}
			>
				<SelectTrigger className="w-full sm:w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{STATUSES.map((s) => (
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
	);
}
