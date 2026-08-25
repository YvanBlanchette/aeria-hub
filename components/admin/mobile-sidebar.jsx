"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/components/i18n/locale-provider";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar({ user }) {
	const [open, setOpen] = useState(false);
	const { t } = useLocale();

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}
		>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden"
				>
					<Menu className="size-5" />
					<span className="sr-only">{t("ui.openMenu", "Open menu")}</span>
				</Button>
			</SheetTrigger>
			<SheetContent
				side="left"
				className="w-64 border-sidebar-border bg-sidebar/96 p-0 text-sidebar-foreground shadow-[8px_0_30px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl [&_svg]:text-sidebar-foreground"
			>
				<SheetHeader className="border-b border-sidebar-border px-5 py-4">
					<SheetTitle asChild>
						<Link
							href="/dashboard"
							className="flex items-center gap-3 rounded-2xl px-1 py-1.5 text-sidebar-foreground"
						>
							<div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
								Æ
							</div>
							<div className="text-left">
								<p className="text-base font-semibold tracking-tight text-sidebar-foreground">ÆRIA Hub</p>
								<p className="text-[11px] uppercase tracking-[0.28em] text-sidebar-foreground/55">{t("ui.travelCrm", "Travel CRM")}</p>
							</div>
						</Link>
					</SheetTitle>
				</SheetHeader>
				<SidebarNav
					onNavigate={() => setOpen(false)}
					user={user}
				/>
				<div className="mx-3 mb-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 px-4 py-3 text-xs text-sidebar-foreground/70">
					{t("ui.mobileWorkspace", "Mobile workspace access for trips, clients, and commissions.")}
				</div>
			</SheetContent>
		</Sheet>
	);
}
