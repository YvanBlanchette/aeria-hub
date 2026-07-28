"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function LocaleText({ messageKey, fallback }) {
	const { t } = useLocale();
	return t(messageKey, fallback);
}
