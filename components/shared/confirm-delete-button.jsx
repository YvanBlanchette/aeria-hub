"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * @param {{ onConfirm: () => Promise<void>, itemLabel: string, description?: string }} props
 */
export function ConfirmDeleteButton({ onConfirm, itemLabel, description }) {
	const { t } = useLocale();
	const [isPending, startTransition] = useTransition();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className="text-destructive hover:text-destructive"
				>
					<Trash2 className="size-4" />
					<span className="sr-only">
						{t("ui.delete", "Delete")} {itemLabel}
					</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("ui.deleteQuestion", "Delete {value}?").replace("{value}", itemLabel)}</AlertDialogTitle>
					<AlertDialogDescription>{description || t("ui.cannotBeUndone", "This cannot be undone.")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("ui.cancel", "Cancel")}</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending}
						onClick={() => startTransition(() => onConfirm())}
					>
						{t("ui.delete", "Delete")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
