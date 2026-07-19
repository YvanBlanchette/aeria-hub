"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { centsToDollarsInputValue } from "@/lib/format";

export const PAYMENT_TYPES = [
  { value: "CC_TO_SUPPLIER", label: "CC to supplier" },
  { value: "FUTURE_CRUISE_CREDIT", label: "Future Cruise Credit" },
];

function dateInputValue(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

/** Shared field set for both the inline "Add payment" form and the edit dialog. */
export function PaymentFields({ payment, idPrefix = "" }) {
  const id = (name) => `${idPrefix}${name}`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id("type")}>Payment type</Label>
        <Select name="type" defaultValue={payment?.type ?? "CC_TO_SUPPLIER"}>
          <SelectTrigger id={id("type")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("cardHolder")}>Card holder</Label>
          <Input id={id("cardHolder")} name="cardHolder" defaultValue={payment?.cardHolder ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("cardNumber")}>Card number</Label>
          <Input id={id("cardNumber")} name="cardNumber" defaultValue={payment?.cardNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("confirmationNumber")}>Confirmation number</Label>
          <Input id={id("confirmationNumber")} name="confirmationNumber" defaultValue={payment?.confirmationNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("amount")}>Payment amount</Label>
          <Input
            id={id("amount")}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={centsToDollarsInputValue(payment?.amount)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("paymentDate")}>Date</Label>
          <Input
            id={id("paymentDate")}
            name="paymentDate"
            type="date"
            defaultValue={dateInputValue(payment?.paymentDate) || dateInputValue(new Date())}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("paidTo")}>Paid to</Label>
          <Input id={id("paidTo")} name="paidTo" placeholder="Exoticca, Air Canada..." defaultValue={payment?.paidTo ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id("comments")}>Comments</Label>
          <Textarea id={id("comments")} name="comments" rows={2} defaultValue={payment?.comments ?? ""} />
        </div>
      </div>
    </>
  );
}
