import { Compass, LayoutDashboard, Users, Plane, Calculator, Percent, FileText, Receipt, Inbox, Building2, MessageSquareText, Settings, Sparkle } from "lucide-react";

/** Sidebar navigation entries. `href: null` renders a disabled "coming soon" item. */
export const navItems = [
	{ label: "Dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, isAdmin: false },
	// { label: "ÆRIA Inspire", labelKey: "nav.inspire", href: "/inspire", icon: Sparkle, isAdmin: true },
	{ label: "Clients", labelKey: "nav.clients", href: "/clients", icon: Users, isAdmin: true },
	{ label: "Trips", labelKey: "nav.trips", href: "/trips", icon: Plane, isAdmin: false },
	{ label: "Packages", labelKey: "nav.forfaits", href: "/packages", icon: Calculator, isAdmin: true },
	{ label: "Commissions", labelKey: "nav.commissions", href: "/commissions", icon: Percent, isAdmin: true },
	// { label: "Quotes", labelKey: "nav.quotes", href: "/quotes", icon: FileText, isAdmin: true },
	// { label: "Invoices", labelKey: "nav.invoices", href: "/invoices", icon: Receipt, isAdmin: true },
	{ label: "Itinerary", labelKey: "nav.itinerary", href: "/itinerary", icon: FileText, isAdmin: false, isClient: true },
	{ label: "Travel Profile", labelKey: "nav.travelProfile", href: "/travel-profile", icon: Compass, isAdmin: false, isClient: true },
	{ label: "Requests", labelKey: "nav.clientRequests", href: "/requests", icon: MessageSquareText, isAdmin: false, isClient: true },
	{ label: "Inquiries", labelKey: "nav.inquiries", href: "/inquiries", icon: Inbox, isAdmin: true },
	{ label: "Suppliers", labelKey: "nav.suppliers", href: "/suppliers", icon: Building2, isAdmin: true },
	// { label: "Client Requests", labelKey: "nav.clientRequests", href: null, icon: MessageSquareText, isAdmin: false },
	{ label: "Settings", labelKey: "nav.settings", href: "/settings", icon: Settings, isAdmin: false },
];

export function canAccessNavItem(item, user) {
	if (item.isClient) return user?.role === "CLIENT";
	if (!item.isAdmin) return true;
	return user?.role === "ADMIN" || user?.role === "AGENT";
}
