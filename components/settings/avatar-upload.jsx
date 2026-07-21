"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadAvatar, removeAvatar } from "@/app/(admin)/settings/actions";
import { initials } from "@/lib/format";

export function AvatarUpload({ name, avatarUrl }) {
  const [error, formAction, pending] = useActionState(uploadAvatar, undefined);
  const [isRemoving, startRemoving] = useTransition();
  const wasPending = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (error) toast.error(error);
      else {
        toast.success("Profile picture updated");
        formRef.current?.reset();
      }
    }
    wasPending.current = pending;
  }, [pending, error]);

  function handleRemove() {
    startRemoving(async () => {
      await removeAvatar();
      toast.success("Profile picture removed");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="size-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-primary text-base text-primary-foreground">{initials(name)}</AvatarFallback>
      </Avatar>

      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
        <Label htmlFor="avatar-file" className="sr-only">
          Upload picture
        </Label>
        <Input id="avatar-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" className="max-w-56" required />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading..." : "Upload"}
        </Button>
        {avatarUrl && (
          <Button type="button" variant="ghost" size="sm" disabled={isRemoving} onClick={handleRemove}>
            Remove
          </Button>
        )}
      </form>
    </div>
  );
}
