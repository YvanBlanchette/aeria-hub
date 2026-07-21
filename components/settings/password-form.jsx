"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/app/(admin)/settings/actions";

export function PasswordForm() {
  const [error, formAction, pending] = useActionState(changePassword, undefined);
  const wasPending = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      toast.success("Password updated");
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
