import {
	LayoutDashboard,
	Users,
	Plane,
	Calculator,
	Percent,
	FileText,
	Receipt,
	Inbox,
	Building2,
	MessageSquareText,
	Settings,
	CalendarDays,
	Sparkle,
} from "lucide-react";

/** Sidebar navigation entries. `href: null` renders a disabled "coming soon" item. */
export const navItems = [
	{ label: "Dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ label: "ÆRIA Inspire", labelKey: "nav.inspire", href: "/inspire", icon: Sparkle },
	{ label: "Clients", labelKey: "nav.clients", href: "/clients", icon: Users },
	{ label: "Trips", labelKey: "nav.trips", href: "/trips", icon: Plane },
	{ label: "Packages", labelKey: "nav.forfaits", href: "/packages", icon: Calculator },
	{ label: "Commissions", labelKey: "nav.commissions", href: "/commissions", icon: Percent },
	{ label: "Quotes", labelKey: "nav.quotes", href: "/quotes", icon: FileText },
	{ label: "Invoices", labelKey: "nav.invoices", href: "/invoices", icon: Receipt },
	{ label: "Calendar", labelKey: "nav.calendar", href: "/calendar", icon: CalendarDays },
	{ label: "Inquiries", labelKey: "nav.inquiries", href: "/inquiries", icon: Inbox },
	{ label: "Suppliers", labelKey: "nav.suppliers", href: "/suppliers", icon: Building2 },
	{ label: "Client Requests", labelKey: "nav.clientRequests", href: null, icon: MessageSquareText },
	{ label: "Settings", labelKey: "nav.settings", href: "/settings", icon: Settings },
];
