import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentUploadDialog } from "@/components/clients/document-upload-dialog";
import { DeleteDocumentButton } from "@/components/clients/delete-document-button";
import { formatDate } from "@/lib/format";

const typeLabels = {
  PASSPORT: "Passport",
  VISA: "Visa",
  INSURANCE: "Insurance",
  TICKET: "Ticket",
  VOUCHER: "Voucher",
  OTHER: "Other",
};

function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRow({ doc }) {
  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/api/documents/${doc.id}`} target="_blank" className="truncate text-sm font-medium hover:underline">
          {doc.fileName}
        </Link>
        <p className="text-xs text-muted-foreground">
          Uploaded {formatDate(doc.uploadedAt)}
          {doc.expiryDate ? ` · Expires ${formatDate(doc.expiryDate)}` : ""}
          {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
        </p>
      </div>
      <Badge variant={isExpired ? "destructive" : "secondary"}>{typeLabels[doc.type] || doc.type}</Badge>
      <DeleteDocumentButton documentId={doc.id} clientId={doc.clientId} fileName={doc.fileName} />
    </div>
  );
}

export default async function DocumentsPage({ params }) {
  const { clientId } = await params;

  const [documents, travelers] = await Promise.all([
    prisma.document.findMany({
      where: { clientId },
      orderBy: { uploadedAt: "desc" },
      include: {
        traveler: { select: { id: true, firstName: true, lastName: true } },
        segment: { select: { id: true, title: true, trip: { select: { id: true, name: true } } } },
      },
    }),
    prisma.traveler.findMany({ where: { clientId }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  const travelerDocs = documents.filter((d) => d.travelerId);
  const segmentDocs = documents.filter((d) => d.segmentId);
  const clientDocs = documents.filter((d) => !d.travelerId && !d.segmentId);

  const tripGroups = new Map();
  for (const doc of segmentDocs) {
    const tripId = doc.segment.trip.id;
    if (!tripGroups.has(tripId)) {
      tripGroups.set(tripId, { tripId, tripName: doc.segment.trip.name, docs: [] });
    }
    tripGroups.get(tripId).docs.push(doc);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        <DocumentUploadDialog clientId={clientId} travelers={travelers} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Client documents</h3>
        {clientDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client-level documents yet.</p>
        ) : (
          <div className="space-y-2">
            {clientDocs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>

      {travelers.map((traveler) => {
        const docs = travelerDocs.filter((d) => d.travelerId === traveler.id);
        if (docs.length === 0) return null;
        return (
          <div key={traveler.id} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {traveler.firstName} {traveler.lastName}
            </h3>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        );
      })}

      {[...tripGroups.values()].map((group) => (
        <div key={group.tripId} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            <Link href={`/trips/${group.tripId}/itinerary`} className="hover:underline">
              {group.tripName}
            </Link>
          </h3>
          <div className="space-y-2">
            {group.docs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
