import { MessageSquareText } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getClientPortalRecord } from "@/lib/client-portal";
import { prisma } from "@/lib/prisma";
import { submitClientRequest } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export const metadata = {
	title: "Requests — ÆRIA Hub",
};

const STATUS_VARIANT = {
	NEW: "secondary",
	CONTACTED: "outline",
	QUALIFIED: "default",
	CONVERTED: "default",
	LOST: "destructive",
};

export default async function ClientRequestsPage({ searchParams }) {
	const user = await requireUser();
	const portal = await getClientPortalRecord(user);
	const params = await searchParams;
	const suggestedMessage = typeof params?.message === "string" ? params.message : "";

	if (!portal) {
		return <div className="p-6 text-muted-foreground">No client profile found for this account.</div>;
	}

	const inquiries = await prisma.inquiry.findMany({
		where: { convertedClientId: portal.client.id },
		orderBy: { createdAt: "desc" },
		take: 30,
		select: { id: true, notes: true, status: true, createdAt: true },
	});

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Advisor contact</p>
				<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">My requests</h1>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">Send a question or travel request to your advisor and follow its status here.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>New request</CardTitle>
					<CardDescription>Your request will be added to your client record.</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						action={submitClientRequest}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="message">What can we help with?</Label>
							<Textarea
								id="message"
								name="message"
								placeholder="Tell us about a change, question, or new travel idea."
								required
								rows={5}
								defaultValue={suggestedMessage}
							/>
						</div>
						<Button type="submit">
							<MessageSquareText className="size-4" /> Send request
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Request history</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{inquiries.length === 0 ? (
						<p className="text-sm text-muted-foreground">You have not sent any requests yet.</p>
					) : (
						inquiries.map((inquiry) => (
							<div
								key={inquiry.id}
								className="rounded-xl border border-border p-4"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="text-xs text-muted-foreground">{formatDate(inquiry.createdAt)}</span>
									<Badge variant={STATUS_VARIANT[inquiry.status] || "secondary"}>{inquiry.status}</Badge>
								</div>
								<p className="mt-3 whitespace-pre-wrap text-sm">{inquiry.notes || "No message provided."}</p>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
