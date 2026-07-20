"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentFormDialog } from "@/components/trips/segment-form-dialog";
import { DeleteSegmentButton } from "@/components/trips/delete-segment-button";
import { SegmentDocumentUploadDialog } from "@/components/trips/segment-document-upload-dialog";
import { DeleteSegmentDocumentButton } from "@/components/trips/delete-segment-document-button";
import { SegmentCommission } from "@/components/trips/segment-commission";
import { CopyableText } from "@/components/clients/copyable-text";
import { SEGMENT_TYPE_MAP, summarizeSegmentDetails } from "@/lib/trip-segments";
import { formatCurrency, formatTime } from "@/lib/format";
import { reorderSegment } from "@/app/(admin)/trips/[tripId]/itinerary/actions";

export function SegmentCard({ segment, tripId, canMoveUp = false, canMoveDown = false }) {
  const [isPending, startTransition] = useTransition();
  const meta = SEGMENT_TYPE_MAP[segment.type] || SEGMENT_TYPE_MAP.OTHER;
  const Icon = meta.icon;
  const summary = summarizeSegmentDetails(segment.type, segment.details);
  const startTime = formatTime(segment.startDateTime);
  const endTime = formatTime(segment.endDateTime);

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex shrink-0 flex-col">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveUp || isPending}
            onClick={() => startTransition(() => reorderSegment(segment.id, tripId, "up"))}
          >
            <ChevronUp className="size-4" />
            <span className="sr-only">Move {segment.title} up</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveDown || isPending}
            onClick={() => startTransition(() => reorderSegment(segment.id, tripId, "down"))}
          >
            <ChevronDown className="size-4" />
            <span className="sr-only">Move {segment.title} down</span>
          </Button>
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{segment.title}</p>
            <Badge variant="secondary" className="text-[10px]">
              {meta.label}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {startTime && (endTime && endTime !== startTime ? `${startTime} – ${endTime}` : startTime)}
            {(startTime || segment.provider) && segment.location ? " · " : ""}
            {segment.location}
            {segment.location && segment.provider ? " · " : ""}
            {segment.provider}
          </p>

          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

          {segment.confirmationNumber && (
            <p className="text-sm">
              <span className="text-muted-foreground">Confirmation: </span>
              <CopyableText value={segment.confirmationNumber} label="confirmation number" />
            </p>
          )}

          {segment.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{segment.notes}</p>}

          {segment.documents?.length > 0 && (
            <ul className="space-y-1 pt-1">
              {segment.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-1.5 text-sm">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <Link href={`/api/documents/${doc.id}`} target="_blank" className="truncate hover:underline">
                    {doc.fileName}
                  </Link>
                  <DeleteSegmentDocumentButton
                    documentId={doc.id}
                    segmentId={segment.id}
                    tripId={tripId}
                    fileName={doc.fileName}
                  />
                </li>
              ))}
            </ul>
          )}

          <SegmentCommission segment={segment} tripId={tripId} />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {segment.cost != null && <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(segment.cost)}</span>}
          <div className="flex items-center gap-1">
            <SegmentDocumentUploadDialog segmentId={segment.id} />
            <SegmentFormDialog
              tripId={tripId}
              segment={segment}
              trigger={
                <Button variant="ghost" size="icon-sm">
                  <Pencil className="size-4" />
                  <span className="sr-only">Edit {segment.title}</span>
                </Button>
              }
            />
            <DeleteSegmentButton segmentId={segment.id} tripId={tripId} segmentTitle={segment.title} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
