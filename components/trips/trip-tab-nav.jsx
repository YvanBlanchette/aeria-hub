"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutList, Route, ListChecks, FileText, CreditCard, Percent } from "lucide-react";

const tabs = [
  { label: "Overview", segment: "overview", icon: LayoutList },
  { label: "Itinerary", segment: "itinerary", icon: Route },
  { label: "Quotes", segment: "quotes", icon: FileText },
  { label: "Payments", segment: "payments", icon: CreditCard },
  { label: "Commissions", segment: "commissions", icon: Percent },
  { label: "Tasks", segment: "tasks", icon: ListChecks },
];

export function TripTabNav({ tripId }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
      {tabs.map((tab) => {
        const href = `/trips/${tripId}/${tab.segment}`;
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
