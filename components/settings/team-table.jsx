"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { ResetPasswordDialog } from "@/components/settings/reset-password-dialog";
import { updateUserRole, removeUser } from "@/app/(admin)/settings/actions";
import { formatDate } from "@/lib/format";

function RoleSelect({ user }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Select
      value={user.role}
      disabled={isPending}
      onValueChange={(role) => {
        startTransition(async () => {
          const error = await updateUserRole(user.id, role);
          if (error) toast.error(error);
        });
      }}
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="AGENT">Agent</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function TeamTable({ users, currentUserId }) {
  async function handleRemove(userId) {
    const error = await removeUser(userId);
    if (error) toast.error(error);
    else toast.success("Teammate removed");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="bg-card">
              <TableCell className="font-medium">
                {u.name}
                {u.id === currentUserId && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    You
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <RoleSelect user={u} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
              <TableCell>
                {u.id !== currentUserId && (
                  <div className="flex justify-end gap-1">
                    <ResetPasswordDialog userId={u.id} userName={u.name} />
                    <ConfirmDeleteButton
                      itemLabel={u.name}
                      description={`This removes ${u.name}'s account. They'll no longer be able to sign in.`}
                      onConfirm={() => handleRemove(u.id)}
                    />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
