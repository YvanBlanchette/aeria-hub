import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { updateOfferShareUrl } from "@/app/(admin)/inspire/actions";
import { ShareOfferCard } from "@/components/inspire/share-offer-card";

export const metadata = {
	title: "Inspire offers — ÆRIA Hub",
};

export default async function InspireOffersPage() {
	await requireUser();

	let offers = [];
	let dataError = null;

	try {
		offers = await prisma.inspireOffer.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				influencer: { select: { id: true, name: true } },
				createdBy: { select: { id: true, name: true } },
				media: { orderBy: { sortOrder: "asc" } },
			},
		});
	} catch (error) {
		console.error("Failed to load Inspire offers", error);
		dataError = error;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Inspire offers</h1>
					<p className="text-sm text-muted-foreground">Create and manage offers that influencers can share.</p>
				</div>
				<Button asChild>
					<Link href="/inspire/offers/new">
						<Plus className="mr-2 size-4" />
						New offer
					</Link>
				</Button>
			</div>

			{dataError ? (
				<Card className="border-destructive/20 bg-destructive/5">
					<CardContent className="py-5">
						<p className="font-medium">Offers could not be loaded.</p>
						<p className="mt-1 text-sm text-muted-foreground">The Inspire tables may not be available yet. Please apply the Prisma migrations on the server.</p>
					</CardContent>
				</Card>
			) : null}

			<div className="grid gap-4">
				{offers.map((offer) => (
					<Card key={offer.id}>
						<CardHeader className="flex flex-row items-start justify-between gap-4">
							<div>
								<CardTitle>{offer.title}</CardTitle>
								<CardDescription>{offer.description || "No description yet."}</CardDescription>
							</div>
							<div className="text-right text-sm text-muted-foreground">
								<div className="font-semibold text-foreground">{formatCurrency(offer.priceCents / 100)}</div>
								<div>{offer.status}</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<ShareOfferCard offer={offer} />
							<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
								<div>
									<div className="font-medium text-foreground">Public page</div>
									<div className="text-muted-foreground">
										{offer.shareUrl ? `${process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"}${offer.shareUrl}` : "No public link yet"}
									</div>
								</div>
								<form action={updateOfferShareUrl.bind(null, offer.id)}>
									<Button
										type="submit"
										variant="outline"
										size="sm"
									>
										Generate link
									</Button>
								</form>
							</div>
							{offer.media.length > 0 && (
								<div className="grid gap-3 md:grid-cols-2">
									{offer.media.map((asset) => (
										<div
											key={asset.id}
											className="overflow-hidden rounded-lg border border-border bg-muted/40"
										>
											{asset.kind === "VIDEO" ? (
												<video
													controls
													className="h-48 w-full object-cover"
												>
													<source src={asset.url} />
												</video>
											) : (
												<img
													src={asset.url}
													alt={asset.caption || offer.title}
													className="h-48 w-full object-cover"
												/>
											)}
											{asset.caption && <div className="px-3 py-2 text-sm text-muted-foreground">{asset.caption}</div>}
										</div>
									))}
								</div>
							)}
							<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
								<span>Assigned to: {offer.influencer?.name || "Unassigned"}</span>
								<span>Created by: {offer.createdBy?.name || "Unknown"}</span>
							</div>
						</CardContent>
					</Card>
				))}
				{offers.length === 0 && (
					<Card>
						<CardContent className="py-10 text-center text-sm text-muted-foreground">No offers yet. Create your first offer to start the program.</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
