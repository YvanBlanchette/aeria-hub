import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

const statusVariant = {
  DRAFT: "secondary",
  SENT: "secondary",
  PARTIALLY_PAID: "default",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

export default async function InvoicesPage({ params }) {
  const { clientId } = await params;

  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { issueDate: "desc" },
    include: { trip: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoices</h2>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No invoices on record for this client.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.trip?.name ? `${invoice.trip.name} · ` : ""}
                      Issued {formatDate(invoice.issueDate)}
                      {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(invoice.amountPaid)} / {formatCurrency(invoice.amount)}
                    </span>
                    <Badge variant={statusVariant[invoice.status] || "secondary"}>{invoice.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
