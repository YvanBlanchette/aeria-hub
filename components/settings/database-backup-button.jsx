"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";

export function DatabaseBackupButton() {
	const { t } = useLocale();

	return (
		<Button asChild>
			<a
				href="/api/admin/database-backup"
				download
			>
				<Download className="size-4" />
				{t("settings.system.downloadBackup", "Download database backup")}
			</a>
		</Button>
	);
}
