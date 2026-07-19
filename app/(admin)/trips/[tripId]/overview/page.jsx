import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

const INVOICE_STATUS_VARIANT = {
  DRAFT: "secondary",
  SENT: "secondary",
  PARTIALLY_PAID: "default",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

export default async function TripOverviewPage({ params }) {
  const { tripId } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      client: true,
      invoices: { orderBy: { issueDate: "desc" } },
      segments: { select: { type: true, cost: true } },
    },
  });

  if (!trip) notFound();

  const segmentsByType = trip.segments.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});
  const segmentsSubtotal = trip.segments.reduce((sum, s) => sum + (s.cost || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trip details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Destination" value={trip.destination} />
            <Field label="Start date" value={trip.startDate ? formatDate(trip.startDate) : null} />
            <Field label="End date" value={trip.endDate ? formatDate(trip.endDate) : null} />
            <Field label="Total price" value={trip.totalPrice != null ? formatCurrency(trip.totalPrice) : null} />
            <Field label="Segments subtotal" value={formatCurrency(segmentsSubtotal)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={`/clients/${trip.client.id}`} className="font-medium hover:underline">
            {trip.client.firstName} {trip.client.lastName}
          </Link>
          <p className="text-sm text-muted-foreground">
            {trip.client.primaryEmail || "No email"} {trip.client.primaryPhone ? `· ${trip.client.primaryPhone}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerary summary</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No segments yet. Add flights, hotels, and more from the Itinerary tab.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(segmentsByType).map(([type, count]) => {
                const meta = SEGMENT_TYPE_MAP[type];
                const Icon = meta?.icon;
                return (
                  <Badge key={type} variant="secondary" className="gap-1.5">
                    {Icon && <Icon className="size-3.5" />}
                    {meta?.label || type} × {count}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices for this trip yet.</p>
          ) : (
            <ul className="space-y-2">
              {trip.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between text-sm">
                  <span>{invoice.invoiceNumber}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {formatCurrency(invoice.amountPaid)} / {formatCurrency(invoice.amount)}
                    <Badge variant={INVOICE_STATUS_VARIANT[invoice.status] || "secondary"}>{invoice.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
