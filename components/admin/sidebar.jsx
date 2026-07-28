"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { SidebarNav } from "./sidebar-nav";
import Image from "next/image";

export function Sidebar() {
	const { t } = useLocale();

	return (
		<aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/96 text-sidebar-foreground shadow-[8px_0_30px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex">
			<div className="border-b border-sidebar-border px-5 py-4">
				<Link
					href="/dashboard"
					className="flex items-center gap-3 rounded-2xl px-1 py-1.5 transition-colors hover:bg-sidebar-accent/60"
				>
					<div className="min-w-0">
						<Image
							src="/branding/aeria-hub-logo-white-horizontal.svg"
							alt="ÆRIA Hub Logo"
							width={100}
							height={100}
							className="h-18 w-auto"
						/>
					</div>
				</Link>
			</div>
			<SidebarNav />
		</aside>
	);
}
