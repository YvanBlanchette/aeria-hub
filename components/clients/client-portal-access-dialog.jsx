"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClientPortalAccess } from "@/app/(admin)/clients/actions";

export function ClientPortalAccessDialog({ clientId, clientName, email, hasPortalAccess }) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const action = createClientPortalAccess.bind(null, clientId);
	const [result, formAction, pending] = useActionState(action, undefined);
	const wasPending = useRef(false);

	useEffect(() => {
		if (wasPending.current && !pending && result?.temporaryPassword) toast.success("Portal access created");
		wasPending.current = pending;
	}, [pending, result]);

	async function copyCredentials() {
		if (!result?.temporaryPassword) return;
		await navigator.clipboard.writeText(`Email: ${result.email}\nTemporary password: ${result.temporaryPassword}`);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="text-gray-900 cursor-pointer"
				>
					<KeyRound className="size-4" />
					{hasPortalAccess ? "Reset portal password" : "Create portal access"}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{hasPortalAccess ? "Reset portal password" : "Create portal access"}</DialogTitle>
					<DialogDescription>Give {clientName} access to the client portal using their primary email address.</DialogDescription>
				</DialogHeader>
				{result?.temporaryPassword ? (
					<div className="space-y-4">
						<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
							<div className="flex items-center gap-2 font-medium">
								<ShieldCheck className="size-4" />
								Access ready
							</div>
							<p className="mt-2">Share these credentials securely. The temporary password is shown only here.</p>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Login email</label>
							<Input
								readOnly
								value={result.email}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Temporary password</label>
							<Input
								readOnly
								value={result.temporaryPassword}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								onClick={copyCredentials}
							>
								{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
								{copied ? "Copied" : "Copy credentials"}
							</Button>
						</DialogFooter>
					</div>
				) : (
					<form
						action={formAction}
						className="space-y-4"
					>
						<div className="space-y-2">
							<label className="text-sm font-medium">Portal email</label>
							<Input
								readOnly
								value={email || "No primary email"}
							/>
						</div>
						{result?.error && (
							<p
								className="text-sm text-destructive"
								role="alert"
							>
								{result.error}
							</p>
						)}
						<DialogFooter>
							<Button
								type="submit"
								disabled={pending || !email}
							>
								{pending ? "Creating..." : hasPortalAccess ? "Generate new password" : "Create access"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
