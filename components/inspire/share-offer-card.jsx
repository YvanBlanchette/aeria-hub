"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ShareOfferCard({ offer }) {
	const [copied, setCopied] = useState(false);
	const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${offer.shareUrl || ""}`;

	async function handleCopy() {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Share2 className="size-4" />
					Ready to share
				</CardTitle>
				<CardDescription>Perfect for TikTok, Instagram, and short-form promotion.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="rounded-lg border border-border bg-background/70 p-3 text-sm">
					<div className="font-medium">{offer.title}</div>
					<div className="mt-1 text-muted-foreground">{offer.description || "A special offer from ÆRIA Inspire."}</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						onClick={handleCopy}
						size="sm"
					>
						{copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
						{copied ? "Copied" : "Copy link"}
					</Button>
					<div className="rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
						{shareUrl || "Generate a share link to publish this offer"}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
