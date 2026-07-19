"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteNote } from "@/app/(admin)/clients/[clientId]/notes/actions";

export function DeleteNoteButton({ noteId, clientId }) {
  return (
    <ConfirmDeleteButton itemLabel="note" onConfirm={() => deleteNote(noteId, clientId)} />
  );
}
