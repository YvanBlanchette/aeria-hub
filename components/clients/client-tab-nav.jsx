"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  Luggage,
  Plane,
  Receipt,
  FolderOpen,
  StickyNote,
  BellRing,
} from "lucide-react";

const tabs = [
  { label: "Profile", segment: "profile", icon: User },
  { label: "Travelers", segment: "travelers", icon: Luggage },
  { label: "Trips", segment: "trips", icon: Plane },
  { label: "Invoices", segment: "invoices", icon: Receipt },
  { label: "Documents", segment: "documents", icon: FolderOpen },
  { label: "Notes", segment: "notes", icon: StickyNote },
  { label: "Reminders", segment: "reminders", icon: BellRing },
];

export function ClientTabNav({ clientId }) {
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
              isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
