import {
  LayoutDashboard,
  Users,
  Plane,
  Percent,
  FileText,
  Receipt,
  Inbox,
  Building2,
  MessageSquareText,
} from "lucide-react";

/** Sidebar navigation entries. `href: null` renders a disabled "coming soon" item. */
export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Trips", href: "/trips", icon: Plane },
  { label: "Commissions", href: "/commissions", icon: Percent },
  { label: "Quotes", href: null, icon: FileText },
  { label: "Invoices", href: null, icon: Receipt },
  { label: "Inquiries", href: null, icon: Inbox },
  { label: "Suppliers", href: null, icon: Building2 },
  { label: "Client Requests", href: null, icon: MessageSquareText },
];
