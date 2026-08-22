import { prisma } from "@/lib/prisma";
import { LocaleText } from "@/components/i18n/locale-text";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
	title: "Suppliers — ÆRIA Hub",
};

export default async function SuppliersPage() {
	const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

	return (
		<div className="space-y-6">
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle>
						<LocaleText
							messageKey="suppliers.title"
							fallback="Suppliers"
						/>
					</CardTitle>
					<SupplierFormDialog />
				</CardHeader>
				<CardContent className="p-0">
					<SuppliersTable suppliers={suppliers} />
				</CardContent>
			</Card>
		</div>
	);
}
