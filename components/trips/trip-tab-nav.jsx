"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { CalendarDays, CreditCard, FileText, LayoutList, ListChecks, Percent, Receipt, Route } from "lucide-react";

const tabs = [
	{ label: "Overview", labelKey: "trips.tabs.overview", segment: "overview", icon: LayoutList, client: true },
	{ label: "Details", labelKey: "trips.tabs.details", segment: "details", icon: Route, client: true },
	{ label: "Quotes", labelKey: "trips.tabs.quotes", segment: "quotes", icon: FileText },
	{ label: "Invoices", labelKey: "trips.tabs.invoices", segment: "invoices", icon: Receipt },
	{ label: "Itinerary", labelKey: "trips.tabs.itinerary", segment: "itinerary", icon: CalendarDays, client: true },
	{ label: "Payments", labelKey: "trips.tabs.payments", segment: "payments", icon: CreditCard },
	{ label: "Commissions", labelKey: "trips.tabs.commissions", segment: "commissions", icon: Percent },
	{ label: "Tasks", labelKey: "trips.tabs.tasks", segment: "tasks", icon: ListChecks },
];

export function TripTabNav({ tripId, role }) {
	const { t } = useLocale();
	const pathname = usePathname();
	const visibleTabs = role === "CLIENT" ? tabs.filter((tab) => tab.client) : tabs;

	return (
		<nav className="flex gap-1 overflow-x-auto pb-2 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
			{visibleTabs.map((tab) => {
				const href = `/trips/${tripId}/${tab.segment}`;
				const isActive = pathname === href;
				const Icon = tab.icon;
				return (
					<Link
						key={tab.segment}
						href={href}
						className={cn(
							"flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
							isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
						)}
					>
						<Icon className="size-4 shrink-0" />
						{t(tab.labelKey, tab.label)}
					</Link>
				);
			})}
		</nav>
	);
}
