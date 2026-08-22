import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function ClientLayout({ children }) {
	const user = await requireUser();

	if (user.role !== "CLIENT") {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
					<h1 className="text-xl font-semibold">Access restricted</h1>
					<p className="mt-2 text-sm text-muted-foreground">This client portal is only available to client accounts.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<Sidebar user={user} />
			<div className="flex min-w-0 flex-1 flex-col">
				<Topbar user={user} />
				<main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
			</div>
			<Toaster />
		</div>
	);
}
