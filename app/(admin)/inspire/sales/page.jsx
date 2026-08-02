import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreateSaleForm } from "@/components/inspire/create-sale-form";

export const metadata = {
	title: "Inspire sales — ÆRIA Hub",
};

export default async function InspireSalesPage() {
	await requireUser();

	let sales = [];
	let influencers = [];
	let offers = [];
	let dataError = null;

	try {
		[sales, influencers, offers] = await Promise.all([
			prisma.inspireSale.findMany({
				orderBy: { createdAt: "desc" },
				include: {
					influencer: { select: { id: true, name: true } },
					offer: { select: { id: true, title: true } },
				},
			}),
			prisma.influencer.findMany({ orderBy: { name: "asc" } }),
			prisma.inspireOffer.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
		]);
	} catch (error) {
		console.error("Failed to load Inspire sales", error);
		dataError = error;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Sales and commissions</h1>
				<p className="text-sm text-muted-foreground">Track attributed bookings and the commissions tied to them.</p>
			</div>

			{dataError ? (
				<Card className="border-destructive/20 bg-destructive/5">
					<CardContent className="py-5">
						<p className="font-medium">Sales could not be loaded.</p>
						<p className="mt-1 text-sm text-muted-foreground">The Inspire tables may not be available yet. Please apply the Prisma migrations on the server.</p>
					</CardContent>
				</Card>
			) : null}

			<CreateSaleForm
				influencers={influencers}
				offers={offers}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Recent sales</CardTitle>
					<CardDescription>Simple baseline tracking for the first Inspire release.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{sales.map((sale) => (
						<div
							key={sale.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
						>
							<div>
								<div className="font-medium">{sale.clientName || "Unnamed client"}</div>
								<div className="text-sm text-muted-foreground">
									{sale.influencer.name} · {sale.offer?.title || "Unlinked offer"}
								</div>
							</div>
							<div className="text-right text-sm">
								<div className="font-semibold">{formatCurrency(sale.bookingAmountCents / 100)}</div>
								<div className="text-muted-foreground">
									Commission {formatCurrency(sale.commissionAmountCents / 100)} · {formatDate(sale.createdAt)}
								</div>
							</div>
						</div>
					))}
					{sales.length === 0 && <p className="text-sm text-muted-foreground">No sales yet. Create a sale entry once a booking is confirmed.</p>}
				</CardContent>
			</Card>
		</div>
	);
}
