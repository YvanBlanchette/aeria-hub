import Link from "next/link";
import { BarChart3, BadgeDollarSign, Sparkle, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export const metadata = {
	title: "ÆRIA Inspire — ÆRIA Hub",
};

export default async function InspirePage() {
	await requireUser();

	let influencers = 0;
	let offers = 0;
	let totalRevenue = 0;
	let totalCommissions = 0;
	let dataError = null;

	try {
		const [influencerCount, offerCount, sales] = await Promise.all([
			prisma.influencer.count(),
			prisma.inspireOffer.count(),
			prisma.inspireSale.aggregate({
				_sum: { bookingAmountCents: true, commissionAmountCents: true },
			}),
		]);

		influencers = influencerCount;
		offers = offerCount;
		totalRevenue = sales._sum.bookingAmountCents || 0;
		totalCommissions = sales._sum.commissionAmountCents || 0;
	} catch (error) {
		console.error("Failed to load Inspire stats", error);
		dataError = error;
	}

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-2xl space-y-2">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">ÆRIA Inspire</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Turn creators into revenue drivers</h1>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground">
							Give influencers a simple view of their offers, sales, and commissions while keeping everything connected to the hub.
						</p>
					</div>
					<Button asChild>
						<Link href="/inspire/offers">Manage offers</Link>
					</Button>
				</div>
			</div>

			{dataError ? (
				<Card className="border-destructive/20 bg-destructive/5">
					<CardContent className="py-5">
						<p className="font-medium">The Inspire module is not ready yet.</p>
						<p className="mt-1 text-sm text-muted-foreground">
							The database tables for Inspire are missing or the Prisma migrations have not been applied on this server yet.
						</p>
					</CardContent>
				</Card>
			) : null}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div>
							<CardTitle>Influencers</CardTitle>
							<CardDescription>Active creators in the program.</CardDescription>
						</div>
						<Users className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{influencers}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div>
							<CardTitle>Offers</CardTitle>
							<CardDescription>Shared offers created for the network.</CardDescription>
						</div>
						<Sparkle className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{offers}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<div>
							<CardTitle>Commissions</CardTitle>
							<CardDescription>Total commissions tracked.</CardDescription>
						</div>
						<BadgeDollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(totalCommissions / 100)}</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>Revenue generated</CardTitle>
						<CardDescription>Bookings attributed to the inspire network.</CardDescription>
					</div>
					<BarChart3 className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-4xl font-semibold">{formatCurrency(totalRevenue / 100)}</div>
					<p className="mt-2 text-sm text-muted-foreground">
						This first version includes the foundation for offers, influence tracking, and attributable sales.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
