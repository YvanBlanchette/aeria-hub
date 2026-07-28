"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocale } from "@/components/i18n/locale-provider";
import { inviteAgent } from "@/app/(admin)/settings/actions";

export function InviteAgentDialog() {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const [error, formAction, pending] = useActionState(inviteAgent, undefined);
	const wasPending = useRef(false);
	const formRef = useRef(null);

	useEffect(() => {
		if (wasPending.current && !pending && !error) {
			setOpen(false);
			formRef.current?.reset();
		}
		wasPending.current = pending;
	}, [pending, error]);

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				<Button size="sm">
					<Plus className="size-4" />
					{t("settings.team.addTeammate", "Add teammate")}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("settings.team.addTeammate", "Add teammate")}</DialogTitle>
				</DialogHeader>
				<form
					ref={formRef}
					action={formAction}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="name">{t("settings.form.name", "Name")}</Label>
						<Input
							id="name"
							name="name"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">{t("settings.form.email", "Email")}</Label>
						<Input
							id="email"
							name="email"
							type="email"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">{t("settings.team.role", "Role")}</Label>
						<Select
							name="role"
							defaultValue="AGENT"
						>
							<SelectTrigger
								id="role"
								className="w-full"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="AGENT">{t("settings.team.agent", "Agent")}</SelectItem>
								<SelectItem value="ADMIN">{t("settings.team.admin", "Admin")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">{t("settings.team.tempPassword", "Temporary password")}</Label>
						<Input
							id="password"
							name="password"
							type="password"
							minLength={8}
							required
						/>
						<p className="text-xs text-muted-foreground">
							{t("settings.team.tempPasswordHint", "Share this with them directly - they can change it later from Settings.")}
						</p>
					</div>

					{error && (
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{error}
						</p>
					)}

					<DialogFooter>
						<Button
							type="submit"
							disabled={pending}
						>
							{pending ? t("settings.team.adding", "Adding...") : t("settings.team.addTeammate", "Add teammate")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
