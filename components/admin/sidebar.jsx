import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-sidebar-foreground">
          ÆRIA <span className="font-normal text-sidebar-foreground/70">Hub</span>
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
