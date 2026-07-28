"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";

export function AppearanceForm() {
	const { theme, setTheme } = useTheme();
	const { t } = useLocale();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	return (
		<div className="max-w-sm space-y-2">
			<Label htmlFor="theme">{t("settings.appearance.theme", "Theme")}</Label>
			<Select
				value={mounted ? theme : undefined}
				onValueChange={setTheme}
			>
				<SelectTrigger
					id="theme"
					className="w-full"
				>
					<SelectValue placeholder={t("settings.appearance.light", "Light")} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="light">{t("settings.appearance.light", "Light")}</SelectItem>
					<SelectItem value="dark">{t("settings.appearance.dark", "Dark")}</SelectItem>
				</SelectContent>
			</Select>
			<p className="text-xs text-muted-foreground">{t("settings.appearance.hint", "Also available from the sun/moon icon in the top bar.")}</p>
		</div>
	);
}
