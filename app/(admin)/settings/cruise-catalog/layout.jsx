import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { CruiseCatalogNav } from "@/components/settings/cruise-catalog-nav";

export const metadata = {
	title: "Cruise Catalog — ÆRIA Hub",
};

export default async function CruiseCatalogLayout({ children }) {
	const user = await requireAdmin().catch(() => null);
	if (!user) notFound();

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold tracking-tight">Cruise catalog</h1>
				<p className="text-sm text-muted-foreground">Manage the reference data used by the cruise segment builder (ships and ports).</p>
			</div>
			<CruiseCatalogNav />
			{children}
		</div>
	);
}
