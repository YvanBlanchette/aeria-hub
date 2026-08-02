import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const metadata = {
	title: "Influencer dashboard — ÆRIA Inspire",
};

export default async function InfluencerDashboardPage({ params }) {
	await requireUser();
	const { influencerId } = await params;

	const influencer = await prisma.influencer.findUnique({
		where: { id: influencerId },
		include: {
			offers: { orderBy: { createdAt: "desc" } },
			sales: { orderBy: { createdAt: "desc" } },
		},
	});

	if (!influencer) {
		notFound();
	}

	const totalRevenue = influencer.sales.reduce((sum, sale) => sum + sale.bookingAmountCents, 0);
	const totalCommissions = influencer.sales.reduce((sum, sale) => sum + sale.commissionAmountCents, 0);

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">ÆRIA Inspire</p>
						<h1 className="text-2xl font-semibold tracking-tight">{influencer.name}</h1>
						<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
							This panel shows the offers assigned to this creator, the sales generated, and the commissions tracked so far.
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Offers</CardTitle>
						<CardDescription>Content assigned to this influencer.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{influencer.offers.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Sales</CardTitle>
						<CardDescription>Bookings attributed to this creator.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(totalRevenue / 100)}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Commissions</CardTitle>
						<CardDescription>Current commission balance.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(totalCommissions / 100)}</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Active offers</CardTitle>
						<CardDescription>Offers this influencer can share.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{influencer.offers.map((offer) => (
							<div
								key={offer.id}
								className="rounded-lg border border-border p-3"
							>
								<div className="font-medium">{offer.title}</div>
								<div className="mt-1 text-sm text-muted-foreground">{offer.description || "No description yet."}</div>
								<div className="mt-2 text-sm text-muted-foreground">Share link: {offer.shareUrl || "#"}</div>
							</div>
						))}
						{influencer.offers.length === 0 && <p className="text-sm text-muted-foreground">No offers assigned yet.</p>}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent sales</CardTitle>
						<CardDescription>Latest confirmed bookings.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{influencer.sales.map((sale) => (
							<div
								key={sale.id}
								className="rounded-lg border border-border p-3"
							>
								<div className="flex items-center justify-between gap-3">
									<div>
										<div className="font-medium">{sale.clientName || "Unnamed client"}</div>
										<div className="text-sm text-muted-foreground">{sale.status}</div>
									</div>
									<div className="text-right text-sm">
										<div className="font-semibold">{formatCurrency(sale.bookingAmountCents / 100)}</div>
										<div className="text-muted-foreground">{formatCurrency(sale.commissionAmountCents / 100)} commission</div>
									</div>
								</div>
							</div>
						))}
						{influencer.sales.length === 0 && <p className="text-sm text-muted-foreground">No sales tracked yet.</p>}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
