import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({ params }) {
	const slug = (await params).shareSlug;
	const offer = await prisma.inspireOffer.findFirst({
		where: { shareUrl: `/share/inspire/${slug}` },
		select: { title: true, description: true },
	});

	if (!offer) return {};

	return {
		title: `${offer.title} — ÆRIA Inspire`,
		description: offer.description || "A special offer from ÆRIA Inspire.",
	};
}

export default async function PublicInspireOfferPage({ params }) {
	const slug = (await params).shareSlug;
	const offer = await prisma.inspireOffer.findFirst({
		where: { shareUrl: `/share/inspire/${slug}` },
		include: {
			influencer: { select: { id: true, name: true, slug: true } },
			media: { orderBy: { sortOrder: "asc" } },
		},
	});

	if (!offer) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%)] px-4 py-10 sm:px-6 lg:px-8">
			<div className="mx-auto flex max-w-5xl flex-col gap-6">
				<div className="rounded-3xl border border-primary/15 bg-background/90 p-6 shadow-sm backdrop-blur sm:p-8">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">ÆRIA Inspire</p>
							<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{offer.title}</h1>
							<p className="max-w-2xl text-sm leading-7 text-muted-foreground">{offer.description || "A curated offer created for the ÆRIA community."}</p>
						</div>
						<div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-right">
							<div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Offer price</div>
							<div className="text-2xl font-semibold">{formatCurrency(offer.priceCents / 100)}</div>
						</div>
					</div>
				</div>

				{offer.media.length > 0 && (
					<div className="grid gap-4 lg:grid-cols-2">
						{offer.media.map((asset) => (
							<Card
								key={asset.id}
								className="overflow-hidden"
							>
								{asset.kind === "VIDEO" ? (
									<video
										controls
										className="h-72 w-full object-cover"
									>
										<source src={asset.url} />
									</video>
								) : (
									<img
										src={asset.url}
										alt={asset.caption || offer.title}
										className="h-72 w-full object-cover"
									/>
								)}
								{asset.caption && <CardContent className="py-3 text-sm text-muted-foreground">{asset.caption}</CardContent>}
							</Card>
						))}
					</div>
				)}

				<Card>
					<CardHeader>
						<CardTitle>About this offer</CardTitle>
						<CardDescription>Shared by {offer.influencer?.name || "an ÆRIA creator"}.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>This offer is ready for social sharing. Reach out to the creator to book, discuss details, or continue the conversation.</p>
						<div className="rounded-lg border border-border bg-muted/40 p-3">
							<div className="font-medium text-foreground">Status</div>
							<div>{offer.status}</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
