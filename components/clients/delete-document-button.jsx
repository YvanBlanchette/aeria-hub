"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteDocument } from "@/app/(admin)/clients/[clientId]/documents/actions";

export function DeleteDocumentButton({ documentId, clientId, fileName }) {
  return (
    <ConfirmDeleteButton
      itemLabel={fileName}
      description="This permanently removes the document and its uploaded file."
      onConfirm={() => deleteDocument(documentId, clientId)}
    />
  );
}
