import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function parseMediaAssets(rawValue) {
	return rawValue
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^(image|video):\s*(.+)$/i);
			const kind = match?.[1]?.toUpperCase() || "IMAGE";
			const url = match?.[2]?.trim() || line;

			return {
				kind,
				url,
			};
		})
		.filter((asset) => asset.url);
}

export const metadata = {
	title: "New inspire offer — ÆRIA Hub",
};

async function createOffer(formData) {
	"use server";

	const user = await requireUser();
	const title = formData.get("title")?.toString().trim();
	const description = formData.get("description")?.toString().trim();
	const priceCents = Number(formData.get("priceCents") || 0);
	const influencerId = formData.get("influencerId")?.toString().trim() || null;
	const status = formData.get("status")?.toString().trim() || "DRAFT";
	const mediaAssets = parseMediaAssets(formData.get("mediaAssets")?.toString() || "");

	if (!title) {
		throw new Error("Title is required");
	}

	try {
		await prisma.inspireOffer.create({
			data: {
				title,
				description: description || null,
				priceCents: Number.isFinite(priceCents) ? priceCents : 0,
				status: status,
				createdById: user.id,
				influencerId,
				shareUrl: `/inspire/shared/${Math.random().toString(36).slice(2, 10)}`,
				media: {
					create: mediaAssets.map((asset, index) => ({
						kind: asset.kind,
						url: asset.url,
						sortOrder: index,
					})),
				},
			},
		});
	} catch (error) {
		console.error("Failed to create Inspire offer", error);
		throw new Error("Unable to create the offer right now. Please ensure the Inspire tables exist on this server.");
	}

	revalidatePath("/inspire/offers");
	redirect("/inspire/offers");
}

export default async function NewInspireOfferPage() {
	await requireUser();

	let influencers = [];
	let dataError = null;

	try {
		influencers = await prisma.influencer.findMany({ orderBy: { name: "asc" } });
	} catch (error) {
		console.error("Failed to load Inspire influencers for offer form", error);
		dataError = error;
	}

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Create an offer</h1>
				<p className="text-sm text-muted-foreground">Set up an offer that an influencer can share from their dashboard.</p>
			</div>

			{dataError ? (
				<Card className="border-destructive/20 bg-destructive/5">
					<CardContent className="py-5">
						<p className="font-medium">The offer form is unavailable right now.</p>
						<p className="mt-1 text-sm text-muted-foreground">
							The Inspire tables may not be available yet on this server. Please apply the Prisma migrations before creating offers.
						</p>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Offer details</CardTitle>
					<CardDescription>Start with the essentials and connect it to an influencer later if needed.</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						action={createOffer}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								name="title"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								rows={4}
							/>
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="priceCents">Price in cents</Label>
								<Input
									id="priceCents"
									name="priceCents"
									type="number"
									min="0"
									defaultValue="0"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="status">Status</Label>
								<select
									id="status"
									name="status"
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="DRAFT">Draft</option>
									<option value="ACTIVE">Active</option>
									<option value="PAUSED">Paused</option>
									<option value="CLOSED">Closed</option>
								</select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="influencerId">Influencer</Label>
							<select
								id="influencerId"
								name="influencerId"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">Unassigned</option>
								{influencers.map((influencer) => (
									<option
										key={influencer.id}
										value={influencer.id}
									>
										{influencer.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="mediaAssets">Shareable media</Label>
							<Textarea
								id="mediaAssets"
								name="mediaAssets"
								rows={6}
								placeholder="image:https://example.com/photo.jpg
video:https://example.com/video.mp4"
							/>
							<p className="text-sm text-muted-foreground">
								Add one asset per line. Use image: or video: prefixes so the offer can be shared on TikTok, Instagram, and other channels.
							</p>
						</div>
						<div className="flex justify-end">
							<Button type="submit">Create offer</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
