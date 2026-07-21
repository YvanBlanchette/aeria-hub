"use client";

import { useState, useTransition } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, useSortableRows } from "@/components/ui/sortable-table";
import { PaymentEditDialog } from "@/components/trips/payment-edit-dialog";
import { setPaymentCancelled } from "@/app/(admin)/trips/[tripId]/payments/actions";
import { PAYMENT_TYPES } from "@/components/trips/payment-fields";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABELS = Object.fromEntries(PAYMENT_TYPES.map((t) => [t.value, t.label]));

const COLUMNS = [
  { key: "paymentDate", label: "Date", kind: "date" },
  { key: "typeLabel", label: "Type" },
  { key: "cardHolder", label: "Card holder" },
  { key: "confirmationNumber", label: "Confirmation #" },
  { key: "paidTo", label: "Paid to" },
  { key: "amount", label: "Amount", align: "right", kind: "number" },
];

function CancelToggle({ payment, tripId }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() => startTransition(() => setPaymentCancelled(payment.id, tripId, !payment.cancelled))}
    >
      {payment.cancelled ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
      <span className="sr-only">{payment.cancelled ? "Reactivate payment" : "Cancel payment"}</span>
    </Button>
  );
}

export function PaymentsTable({ payments, tripId }) {
  const [hideCancelled, setHideCancelled] = useState(false);
  const filtered = hideCancelled ? payments.filter((p) => !p.cancelled) : payments;
  const rows = filtered.map((p) => ({ ...p, typeLabel: TYPE_LABELS[p.type] || p.type }));
  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(rows, COLUMNS);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Checkbox id="hideCancelled" checked={hideCancelled} onCheckedChange={(v) => setHideCancelled(Boolean(v))} />
        <Label htmlFor="hideCancelled" className="text-sm font-normal text-muted-foreground">
          Hide cancelled payments
        </Label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <SortableTableHead key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                ))}
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((payment) => (
                <TableRow key={payment.id} className={cn(payment.cancelled && "opacity-50")}>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {TYPE_LABELS[payment.type] || payment.type}
                      {payment.cancelled && (
                        <Badge variant="destructive" className="text-[10px]">
                          Cancelled
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.cardHolder || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.confirmationNumber || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.paidTo || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <PaymentEditDialog payment={payment} tripId={tripId} />
                      <CancelToggle payment={payment} tripId={tripId} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
