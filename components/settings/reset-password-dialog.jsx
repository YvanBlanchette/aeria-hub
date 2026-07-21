"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetUserPassword } from "@/app/(admin)/settings/actions";

export function ResetPasswordDialog({ userId, userName }) {
  const [open, setOpen] = useState(false);
  const action = resetUserPassword.bind(null, userId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setOpen(false);
      formRef.current?.reset();
      toast.success(`Password reset for ${userName}`);
    }
    wasPending.current = pending;
  }, [pending, error, userName]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <KeyRound className="size-4" />
          <span className="sr-only">Reset password for {userName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {userName}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
          </div>
          <p className="text-xs text-muted-foreground">
            Share the new password with {userName} directly — there's no email reset flow yet.
          </p>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
