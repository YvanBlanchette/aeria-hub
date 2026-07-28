"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { User, Luggage, Plane, Receipt, FolderOpen, StickyNote, BellRing } from "lucide-react";

const tabs = [
	{ label: "Profile", labelKey: "clients.tabs.profile", segment: "profile", icon: User },
	{ label: "Travelers", labelKey: "clients.tabs.travelers", segment: "travelers", icon: Luggage },
	{ label: "Trips", labelKey: "clients.tabs.trips", segment: "trips", icon: Plane },
	{ label: "Invoices", labelKey: "clients.tabs.invoices", segment: "invoices", icon: Receipt },
	{ label: "Documents", labelKey: "clients.tabs.documents", segment: "documents", icon: FolderOpen },
	{ label: "Notes", labelKey: "clients.tabs.notes", segment: "notes", icon: StickyNote },
	{ label: "Reminders", labelKey: "clients.tabs.reminders", segment: "reminders", icon: BellRing },
];

export function ClientTabNav({ clientId }) {
	const { t } = useLocale();
	const pathname = usePathname();

	return (
		<nav className="flex gap-1 overflow-x-auto pb-2 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
			{tabs.map((tab) => {
				const href = `/clients/${clientId}/${tab.segment}`;
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
