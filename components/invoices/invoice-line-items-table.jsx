"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { InvoiceLineItemFormDialog } from "@/components/invoices/invoice-line-item-form-dialog";
import { DeleteInvoiceLineItemButton } from "@/components/invoices/delete-invoice-line-item-button";
import { formatCurrency } from "@/lib/format";

const COLUMNS = [
  { key: "description", label: "Description" },
  { key: "quantity", label: "Qty", align: "right", kind: "number" },
  { key: "unitPrice", label: "Unit price", align: "right", kind: "number" },
  { key: "lineTotal", label: "Total", align: "right", kind: "number" },
];

export function InvoiceLineItemsTable({ lineItems, invoiceId }) {
  const rows = lineItems.map((li) => ({ ...li, lineTotal: li.quantity * li.unitPrice }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            ))}
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((li) => (
            <TableRow key={li.id}>
              <TableCell className="font-medium">{li.description}</TableCell>
              <TableCell className="text-right">{li.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(li.unitPrice)}</TableCell>
              <TableCell className="text-right">{formatCurrency(li.lineTotal)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <InvoiceLineItemFormDialog
                    invoiceId={invoiceId}
                    lineItem={li}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit {li.description}</span>
                      </Button>
                    }
                  />
                  <DeleteInvoiceLineItemButton lineItemId={li.id} invoiceId={invoiceId} itemLabel={li.description} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
