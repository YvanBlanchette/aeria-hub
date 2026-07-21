import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
	return (
		<aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
			<div className="flex h-14 items-center border-b border-sidebar-border px-5">
				<Link
					href="/dashboard"
					className="text-4xl flex items-center justify-center gap-1.5 font-semibold w-full tracking-tight text-sidebar-foreground"
				>
					ÆRIA <span className="font-light text-accent">Hub</span>
				</Link>
			</div>
			<SidebarNav />
		</aside>
	);
}
