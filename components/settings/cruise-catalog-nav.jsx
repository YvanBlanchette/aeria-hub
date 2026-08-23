"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
	{ label: "Cruise ships", segment: "ships" },
	{ label: "Cruise ports", segment: "ports" },
];

export function CruiseCatalogNav() {
	const pathname = usePathname();

	return (
		<nav className="flex gap-1 overflow-x-auto pb-2">
			{tabs.map((tab) => {
				const href = `/settings/cruise-catalog/${tab.segment}`;
				const isActive = pathname === href;
				return (
					<Link
						key={tab.segment}
						href={href}
						className={cn(
							"shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
							isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
