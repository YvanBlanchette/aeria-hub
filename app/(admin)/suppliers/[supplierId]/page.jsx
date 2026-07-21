import { notFound } from "next/navigation";
import { Pencil, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { DeleteSupplierButton } from "@/components/suppliers/delete-supplier-button";
import { SupplierSegmentsTable } from "@/components/suppliers/supplier-segments-table";
import { SUPPLIER_CATEGORY_MAP } from "@/lib/suppliers";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function SupplierDetailPage({ params }) {
  const { supplierId } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) notFound();

  const segments = await prisma.tripSegment.findMany({
    where: { supplierId },
    orderBy: [{ startDateTime: "desc" }, { createdAt: "desc" }],
    include: { trip: { include: { client: { select: { firstName: true, lastName: true } } } } },
  });

  const meta = SUPPLIER_CATEGORY_MAP[supplier.category];
  const Icon = meta?.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
            <Badge variant="secondary" className="gap-1.5">
              {Icon && <Icon className="size-3.5" />}
              {meta?.label || supplier.category}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SupplierFormDialog
            supplier={supplier}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          />
          <DeleteSupplierButton supplierId={supplier.id} supplierName={supplier.name} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone" value={supplier.phone} />
            <Field
              label="Public website"
              value={
                supplier.website ? (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {supplier.website} <ExternalLink className="size-3.5" />
                  </a>
                ) : null
              }
            />
            <Field
              label="Agent platform URL"
              value={
                supplier.agentPortalUrl ? (
                  <a
                    href={supplier.agentPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {supplier.agentPortalUrl} <ExternalLink className="size-3.5" />
                  </a>
                ) : null
              }
            />
          </dl>
          {supplier.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm">{supplier.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierSegmentsTable segments={segments} />
        </CardContent>
      </Card>
    </div>
  );
}
