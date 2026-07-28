"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";

export function LanguageForm() {
	const { locale, setLocale, t } = useLocale();

	return (
		<div className="max-w-sm space-y-2">
			<Label htmlFor="language">{t("settings.language.label", "Display language")}</Label>
			<Select
				value={locale}
				onValueChange={setLocale}
			>
				<SelectTrigger
					id="language"
					className="w-full"
				>
					<SelectValue placeholder={t("settings.language.en", "English")} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="en">{t("settings.language.en", "English")}</SelectItem>
					<SelectItem value="fr">{t("settings.language.fr", "Francais")}</SelectItem>
				</SelectContent>
			</Select>
			<p className="text-xs text-muted-foreground">{t("settings.language.hint", "This preference is saved on this device.")}</p>
		</div>
	);
}
