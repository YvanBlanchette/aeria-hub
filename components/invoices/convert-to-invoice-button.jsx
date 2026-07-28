"use client";

import { useTransition } from "react";
import { Receipt } from "lucide-react";
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
 * @param {{ action: () => Promise<void>, description: string, label?: string, variant?: string, size?: string }} props
 */
export function ConvertToInvoiceButton({ action, description, label = "Convert to invoice", variant = "outline", size = "sm" }) {
	const { t } = useLocale();
	const [isPending, startTransition] = useTransition();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant={variant}
					size={size}
				>
					<Receipt className="size-4" />
					{label}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("quotes.convertToInvoiceTitle", "Generate invoice?")}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("ui.cancel", "Cancel")}</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending}
						onClick={() => startTransition(() => action())}
					>
						{t("quotes.convertToInvoiceConfirm", "Generate invoice")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
