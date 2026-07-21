import { prisma } from "@/lib/prisma";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export const metadata = {
  title: "Suppliers — ÆRIA Hub",
};

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Airlines, cruise lines, hotels, and other vendors you book through.</p>
        </div>
        <SupplierFormDialog />
      </div>

      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
