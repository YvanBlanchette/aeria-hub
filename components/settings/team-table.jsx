"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { ResetPasswordDialog } from "@/components/settings/reset-password-dialog";
import { updateUserRole, removeUser } from "@/app/(admin)/settings/actions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/format";

function RoleSelect({ user, t }) {
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
				<SelectItem value="ADMIN">{t("settings.team.admin", "Admin")}</SelectItem>
				<SelectItem value="AGENT">{t("settings.team.agent", "Agent")}</SelectItem>
			</SelectContent>
		</Select>
	);
}

export function TeamTable({ users, currentUserId }) {
	const { t } = useLocale();

	async function handleRemove(userId) {
		const error = await removeUser(userId);
		if (error) toast.error(error);
		else toast.success(t("settings.team.removed", "Teammate removed"));
	}

	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("settings.form.name", "Name")}</TableHead>
						<TableHead>{t("settings.form.email", "Email")}</TableHead>
						<TableHead>{t("settings.team.role", "Role")}</TableHead>
						<TableHead>{t("settings.team.joined", "Joined")}</TableHead>
						<TableHead className="w-24 text-right">{t("settings.team.actions", "Actions")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((u) => (
						<TableRow
							key={u.id}
							className="bg-card"
						>
							<TableCell className="font-medium">
								{u.name}
								{u.id === currentUserId && (
									<Badge
										variant="secondary"
										className="ml-2 text-[10px]"
									>
										{t("settings.team.you", "You")}
									</Badge>
								)}
							</TableCell>
							<TableCell className="text-muted-foreground">{u.email}</TableCell>
							<TableCell>
								<RoleSelect
									user={u}
									t={t}
								/>
							</TableCell>
							<TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
							<TableCell>
								{u.id !== currentUserId && (
									<div className="flex justify-end gap-1">
										<ResetPasswordDialog
											userId={u.id}
											userName={u.name}
										/>
										<ConfirmDeleteButton
											itemLabel={u.name}
											description={t("settings.team.removeDescription", "This removes {name}'s account. They'll no longer be able to sign in.").replace(
												"{name}",
												u.name,
											)}
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
