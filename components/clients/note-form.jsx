"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ action }) {
  const [error, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <Textarea name="body" rows={3} placeholder="Add a note about this client..." required />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add note"}
        </Button>
      </div>
    </form>
  );
}
