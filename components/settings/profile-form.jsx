"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/(admin)/settings/actions";

export function ProfileForm({ user }) {
  const [error, formAction, pending] = useActionState(updateProfile, undefined);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) toast.success("Profile updated");
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={user.email} required />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
