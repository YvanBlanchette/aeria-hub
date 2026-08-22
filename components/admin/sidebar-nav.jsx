"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { navItems } from "./nav-config";

export function SidebarNav({ onNavigate, user }) {
	const pathname = usePathname();
	const { t } = useLocale();
	const visibleItems = navItems.filter((item) => {
		if (item.isClient) return user?.role === "CLIENT";
		if (!item.isAdmin) return true;
		return user?.role === "ADMIN" || user?.role === "AGENT";
	});

	return (
		<nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
			{visibleItems.map((item) => {
				const Icon = item.icon;
				const isActive = item.href && pathname.startsWith(item.href);
				const label = t(item.labelKey, item.label);

				if (!item.href) {
					return (
						<div
							key={item.label}
							className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40"
							aria-disabled="true"
						>
							<Icon className="size-4 shrink-0" />
							<span className="flex-1">{label}</span>
							<span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
								{t("ui.soon", "Soon")}
							</span>
						</div>
					);
				}

				return (
					<Link
						key={item.label}
						href={item.href}
						onClick={onNavigate}
						className={cn(
							"group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/82 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
							isActive &&
								"bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/10 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
						)}
					>
						<Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-105", isActive && "text-sidebar-primary-foreground")} />
						<span className="flex-1">{label}</span>
						{isActive && <span className="size-1.5 rounded-full bg-sidebar-primary-foreground/80" />}
					</Link>
				);
			})}
		</nav>
	);
}
