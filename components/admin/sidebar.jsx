import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
	return (
		<aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/96 text-sidebar-foreground shadow-[8px_0_30px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex">
			<div className="border-b border-sidebar-border px-5 py-4">
				<Link
					href="/dashboard"
					className="flex items-center gap-3 rounded-2xl px-1 py-1.5 transition-colors hover:bg-sidebar-accent/60"
				>
					<div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground shadow-lg shadow-black/10">
						Æ
					</div>
					<div className="min-w-0">
						<p className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">ÆRIA Hub</p>
						<p className="text-[11px] uppercase tracking-[0.28em] text-sidebar-foreground/55">Travel CRM</p>
					</div>
				</Link>
			</div>
			<SidebarNav />
		</aside>
	);
}
