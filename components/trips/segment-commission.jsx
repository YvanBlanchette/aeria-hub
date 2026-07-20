"use client";

import { useTransition } from "react";
import { Percent, Pencil, Check, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommissionFormDialog } from "@/components/trips/commission-form-dialog";
import { DeleteCommissionButton } from "@/components/trips/delete-commission-button";
import { setCommissionReceived } from "@/app/(admin)/trips/[tripId]/itinerary/actions";
import { isExoticcaCircuit } from "@/lib/commissions";
import { formatCurrency, formatDate } from "@/lib/format";

function ReceivedToggle({ portion }) {
  const [isPending, startTransition] = useTransition();
  const received = portion.status === "RECEIVED";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={() => startTransition(() => setCommissionReceived(portion.id, !received))}
    >
      {received ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
      <span className="sr-only">{received ? "Mark as pending" : "Mark as received"}</span>
    </Button>
  );
}

export function SegmentCommission({ segment, tripId }) {
  const portions = segment.commissions || [];

  if (portions.length === 0) {
    return (
      <CommissionFormDialog
        segmentId={segment.id}
        trigger={
          <Button variant="ghost" size="icon-sm">
            <Percent className="size-4" />
            <span className="sr-only">Set commission</span>
          </Button>
        }
      />
    );
  }

  const total = portions.reduce((sum, p) => sum + p.amount, 0);
  const split = isExoticcaCircuit(segment);

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center gap-1 text-sm">
        <Percent className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">Commission {formatCurrency(total)}</span>
        <CommissionFormDialog
          segmentId={segment.id}
          totalAmount={total}
          isSplit={split}
          trigger={
            <Button variant="ghost" size="icon-sm">
              <Pencil className="size-3.5" />
              <span className="sr-only">Edit commission</span>
            </Button>
          }
        />
        <DeleteCommissionButton segmentId={segment.id} tripId={tripId} />
      </div>
      <ul className="space-y-1 pl-5">
        {portions.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatCurrency(p.amount)}</span>
            {p.dueDate && <span>due {formatDate(p.dueDate)}</span>}
            <Badge variant={p.status === "RECEIVED" ? "default" : "secondary"} className="text-[10px]">
              {p.status === "RECEIVED" ? "Received" : "Pending"}
            </Badge>
            <ReceivedToggle portion={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
