"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { logout } from "@/lib/actions/session-actions";
import { initials } from "@/lib/format";
import { useLocale } from "@/components/i18n/locale-provider";

export function Topbar({ user }) {
	const pathname = usePathname();
	const { t } = useLocale();

	function getPageTitle() {
		if (pathname === "/dashboard") return t("nav.dashboard", "Dashboard");
		if (pathname === "/clients" || pathname.startsWith("/clients/")) return t("nav.clients", "Clients");
		if (pathname === "/trips" || pathname.startsWith("/trips/")) return t("nav.trips", "Trips");
		if (pathname === "/calendar") return t("nav.calendar", "Calendar");
		if (pathname === "/packages") return t("nav.forfaits", "Packages");
		if (pathname === "/commissions") return t("nav.commissions", "Commissions");
		if (pathname === "/suppliers" || pathname.startsWith("/suppliers/")) return t("nav.suppliers", "Suppliers");
		if (pathname === "/settings") return t("nav.settings", "Settings");
		if (pathname === "/itinerary") return t("nav.itinerary", "Itinerary");
		if (pathname === "/travel-profile") return t("nav.travelProfile", "Travel Profile");
		if (pathname === "/requests") return t("nav.clientRequests", "Requests");
		return "ÆRIA Hub";
	}

	function getPageSubtitle() {
		if (pathname === "/dashboard") return t("topbar.dashboardSubtitle", "Your operations overview");
		if (pathname === "/clients" || pathname.startsWith("/clients/")) return t("topbar.clientsSubtitle", "Manage households and travelers");
		if (pathname === "/trips" || pathname.startsWith("/trips/")) return t("topbar.tripsSubtitle", "Plan bookings and travel delivery");
		if (pathname === "/calendar") return t("topbar.calendarSubtitle", "Track departures and important dates");
		if (pathname === "/packages") return t("topbar.packagesSubtitle", "Build and manage travel packages");
		if (pathname === "/commissions") return t("topbar.commissionsSubtitle", "Monitor agency earnings");
		if (pathname === "/suppliers" || pathname.startsWith("/suppliers/")) return t("topbar.suppliersSubtitle", "Manage travel partners");
		if (pathname === "/settings") return t("topbar.settingsSubtitle", "Configure your workspace");
		if (pathname === "/itinerary") return t("topbar.itinerarySubtitle", "Review your travel arrangements");
		if (pathname === "/travel-profile") return t("topbar.travelProfileSubtitle", "Discover your AERIA travel style");
		if (pathname === "/requests") return t("topbar.requestsSubtitle", "Stay connected with your advisor");
		return t("topbar.defaultSubtitle", "AERIA travel workspace");
	}

	return (
		<header className="flex h-[80px] shrink-0 items-center gap-3 border-b border-border/80 bg-card/90 px-4 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] backdrop-blur-xl">
			<MobileSidebar user={user} />

			<div className="flex w-full items-center justify-between gap-4 px-2 sm:px-4">
				<div className="min-w-0 flex-1">
					<p className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{getPageSubtitle()}</p>
					<h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">{getPageTitle()}</h1>
				</div>

				<div className="flex items-center gap-1.5">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
							>
								<Bell className="size-4" />
								<span className="sr-only">{t("topbar.notifications", "Notifications")}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-64"
						>
							<DropdownMenuLabel>{t("topbar.notifications", "Notifications")}</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("topbar.caughtUp", "You're all caught up.")}</p>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="gap-2 rounded-full px-1.5 hover:bg-transparent"
							>
								<Avatar className="size-10">
									{user?.avatarUrl && (
										<AvatarImage
											src={user.avatarUrl}
											alt={user.name}
										/>
									)}
									<AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials(user?.name)}</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel className="flex flex-col">
								<span className="font-medium">{user?.name}</span>
								<span className="text-xs font-normal capitalize text-muted-foreground">{user?.role?.toLowerCase()}</span>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href="/settings">
									<Settings className="size-4" />
									{t("topbar.settings", "Settings")}
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => logout()}>
								<LogOut className="size-4" />
								{t("topbar.logout", "Log out")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
