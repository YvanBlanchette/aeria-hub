import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuoteFormDialog } from "@/components/trips/quote-form-dialog";
import { QuoteCard } from "@/components/trips/quote-card";
import { LocaleText } from "@/components/i18n/locale-text";

export default async function TripQuotesPage({ params }) {
	const { tripId } = await params;

	const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
	if (!trip) notFound();

	const quotes = await prisma.quote.findMany({
		where: { tripId },
		orderBy: { createdAt: "desc" },
		include: { lineItems: { orderBy: { sortOrder: "asc" } } },
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">
					<LocaleText
						messageKey="quotes.title"
						fallback="Quotes"
					/>
				</h2>
				<QuoteFormDialog tripId={tripId} />
			</div>

			{quotes.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<LocaleText
						messageKey="quotes.empty"
						fallback="No quotes yet. Create one to itemize pricing options for this trip."
					/>
				</p>
			) : (
				<div className="space-y-4">
					{quotes.map((quote) => (
						<QuoteCard
							key={quote.id}
							quote={quote}
							tripId={tripId}
						/>
					))}
				</div>
			)}
		</div>
	);
}
