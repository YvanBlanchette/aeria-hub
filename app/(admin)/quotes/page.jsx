import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { QuoteCard } from "@/components/trips/quote-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleText } from "@/components/i18n/locale-text";
import { createQuoteFromHub } from "@/app/(admin)/quotes/actions";
import { tServer } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";
import { quoteScope, tripScope } from "@/lib/visibility-scope";

export const metadata = {
	title: "Quotes - AERIA Hub",
};

export default async function QuotesPage() {
	const t = tServer;
	const user = await requireUser();
	const quotesWhere = quoteScope(user);
	const tripsWhere = tripScope(user);
	const [quotes, trips] = await Promise.all([
		prisma.quote.findMany({
			where: quotesWhere,
			orderBy: { createdAt: "desc" },
			include: {
				lineItems: { orderBy: { sortOrder: "asc" } },
				trip: { select: { id: true, name: true, destination: true, client: { select: { firstName: true, lastName: true } } } },
			},
		}),
		prisma.trip.findMany({
			where: tripsWhere,
			orderBy: { createdAt: "desc" },
			take: 200,
			select: {
				id: true,
				name: true,
				destination: true,
				client: { select: { firstName: true, lastName: true } },
			},
		}),
	]);

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="space-y-2">
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
						<LocaleText
							messageKey="quotes.hub.kicker"
							fallback="Sales workspace"
						/>
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
						<LocaleText
							messageKey="quotes.title"
							fallback="Quotes"
						/>
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						<LocaleText
							messageKey="quotes.hub.subtitle"
							fallback="Create and manage trip quotes in one place, then convert accepted options to invoices."
						/>
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						<LocaleText
							messageKey="quotes.hub.createTitle"
							fallback="Create quote"
						/>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						action={createQuoteFromHub}
						className="grid grid-cols-1 gap-3 md:grid-cols-4"
					>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="tripId">
								<LocaleText
									messageKey="quotes.hub.trip"
									fallback="Trip"
								/>
							</Label>
							<select
								id="tripId"
								name="tripId"
								required
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="">
									<LocaleText
										messageKey="quotes.hub.selectTrip"
										fallback="Select a trip"
									/>
								</option>
								{trips.map((trip) => (
									<option
										key={trip.id}
										value={trip.id}
									>
										{trip.name} - {trip.client.firstName} {trip.client.lastName}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1">
							<Label htmlFor="title">
								<LocaleText
									messageKey="quotes.form.title"
									fallback="Title"
								/>
							</Label>
							<Input
								id="title"
								name="title"
								placeholder={t("quotes.form.titlePlaceholder", "Caribbean cruise package, Option A...")}
								required
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="validUntil">
								<LocaleText
									messageKey="quotes.form.validUntil"
									fallback="Valid until"
								/>
							</Label>
							<Input
								id="validUntil"
								name="validUntil"
								type="date"
							/>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label htmlFor="notes">
								<LocaleText
									messageKey="quotes.form.notes"
									fallback="Notes"
								/>
							</Label>
							<Input
								id="notes"
								name="notes"
								placeholder={t("quotes.hub.notesPlaceholder", "Optional note for the client or internal context")}
							/>
						</div>
						<div className="flex items-end md:col-span-1">
							<Button
								type="submit"
								className="w-full"
							>
								<LocaleText
									messageKey="quotes.form.create"
									fallback="Create quote"
								/>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{quotes.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-sm text-muted-foreground">
						<LocaleText
							messageKey="quotes.hub.empty"
							fallback="No quotes yet. Create one above to start itemizing options."
						/>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{quotes.map((quote) => (
						<div
							key={quote.id}
							className="space-y-2"
						>
							<div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
								<span>
									<LocaleText
										messageKey="quotes.hub.tripPrefix"
										fallback="Trip"
									/>
									:{" "}
									<Link
										href={`/trips/${quote.tripId}/overview`}
										className="font-medium text-foreground hover:underline"
									>
										{quote.trip?.name || t("quotes.hub.unknownTrip", "Unknown trip")}
									</Link>
								</span>
								<span>{quote.trip?.destination || "-"}</span>
							</div>
							<QuoteCard
								quote={quote}
								tripId={quote.tripId}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
