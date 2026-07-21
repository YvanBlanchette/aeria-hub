"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-config";

export function SidebarNav({ onNavigate }) {
	const pathname = usePathname();

	return (
		<nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
			{navItems.map((item) => {
				const Icon = item.icon;
				const isActive = item.href && pathname.startsWith(item.href);

				if (!item.href) {
					return (
						<div
							key={item.label}
							className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/40"
							aria-disabled="true"
						>
							<Icon className="size-4 shrink-0" />
							<span className="flex-1">{item.label}</span>
							<span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/50">Soon</span>
						</div>
					);
				}

				return (
					<Link
						key={item.label}
						href={item.href}
						onClick={onNavigate}
						className={cn(
							"group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/82 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
							isActive &&
								"bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/10 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
						)}
					>
						<Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-105", isActive && "text-sidebar-primary-foreground")} />
						<span className="flex-1">{item.label}</span>
						{isActive && <span className="size-1.5 rounded-full bg-sidebar-primary-foreground/80" />}
					</Link>
				);
			})}
		</nav>
	);
}
