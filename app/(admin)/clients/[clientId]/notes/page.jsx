import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoteForm } from "@/components/clients/note-form";
import { DeleteNoteButton } from "@/components/clients/delete-note-button";
import { formatDate } from "@/lib/format";
import { createNote } from "./actions";

export default async function NotesPage({ params }) {
  const { clientId } = await params;

  const notes = await prisma.note.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const boundCreateNote = createNote.bind(null, clientId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a note</CardTitle>
        </CardHeader>
        <CardContent>
          <NoteForm action={boundCreateNote} />
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {note.author?.name} · {formatDate(note.createdAt)}
                    </p>
                  </div>
                  <DeleteNoteButton noteId={note.id} clientId={clientId} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
