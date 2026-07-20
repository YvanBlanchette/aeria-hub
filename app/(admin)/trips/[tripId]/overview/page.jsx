import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddTripClientDialog } from "@/components/trips/add-trip-client-dialog";
import { RemoveTripClientButton } from "@/components/trips/remove-trip-client-button";
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
      payments: { where: { cancelled: false }, select: { amount: true } },
      additionalClients: { include: { client: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!trip) notFound();

  const excludedIds = new Set([trip.clientId, ...trip.additionalClients.map((ac) => ac.clientId)]);
  const availableClients = await prisma.client.findMany({
    where: { id: { notIn: [...excludedIds] } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, primaryEmail: true },
  });

  const segmentsByType = trip.segments.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});
  const segmentsSubtotal = trip.segments.reduce((sum, s) => sum + (s.cost || 0), 0);
  const paymentsTotal = trip.payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = segmentsSubtotal - paymentsTotal;

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
            <Field label="Final payment date" value={trip.finalPaymentDate ? formatDate(trip.finalPaymentDate) : null} />
            <Field label="Payments received" value={formatCurrency(paymentsTotal)} />
            <Field
              label="Balance due"
              value={
                <span className={balanceDue > 0 ? "font-medium text-destructive" : "font-medium"}>
                  {formatCurrency(balanceDue)}
                </span>
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Clients</CardTitle>
          <AddTripClientDialog tripId={tripId} clients={availableClients} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/clients/${trip.client.id}`} className="font-medium hover:underline">
                {trip.client.firstName} {trip.client.lastName}
              </Link>
              <Badge variant="secondary" className="text-[10px]">
                Primary
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {trip.client.primaryEmail || "No email"} {trip.client.primaryPhone ? `· ${trip.client.primaryPhone}` : ""}
            </p>
          </div>

          {trip.additionalClients.map((ac) => (
            <div key={ac.id} className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <div>
                <Link href={`/clients/${ac.client.id}`} className="font-medium hover:underline">
                  {ac.client.firstName} {ac.client.lastName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {ac.client.primaryEmail || "No email"} {ac.client.primaryPhone ? `· ${ac.client.primaryPhone}` : ""}
                </p>
              </div>
              <RemoveTripClientButton
                tripClientId={ac.id}
                tripId={tripId}
                clientName={`${ac.client.firstName} ${ac.client.lastName}`}
              />
            </div>
          ))}
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
                  <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
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
