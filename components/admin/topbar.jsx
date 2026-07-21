"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Plus, Bell, LogOut, UserPlus, Plane, Receipt, Sun, Moon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function Topbar({ user }) {
	const router = useRouter();
	const { resolvedTheme, setTheme } = useTheme();

	function handleSearch(event) {
		event.preventDefault();
		const q = new FormData(event.currentTarget).get("q");
		router.push(q ? `/clients?q=${encodeURIComponent(q)}` : "/clients");
	}

	return (
		<header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-card/90 px-4 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] backdrop-blur-xl">
			<MobileSidebar />

			<div className="flex w-full items-center justify-between gap-4 px-2 sm:px-4">
				<form
					onSubmit={handleSearch}
					className="relative hidden flex-1 max-w-md sm:block"
				>
					<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						name="q"
						placeholder="Search clients..."
						className="h-10 rounded-full border-border/80 bg-background/80 pl-8 shadow-sm backdrop-blur"
					/>
				</form>

				<div className="flex-1 sm:hidden" />

				<div className="flex items-center gap-1.5">
					<Button
						size="icon"
						variant="ghost"
						onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
					>
						<Sun className="size-4 dark:hidden" />
						<Moon className="hidden size-4 dark:block" />
						<span className="sr-only">Toggle theme</span>
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								size="icon"
								variant="ghost"
							>
								<Bell className="size-4" />
								<span className="sr-only">Notifications</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-64"
						>
							<DropdownMenuLabel>Notifications</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
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
									Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => logout()}>
								<LogOut className="size-4" />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
