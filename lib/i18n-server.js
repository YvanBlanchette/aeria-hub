import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, normalizeLocale, getLocaleMessage } from "@/lib/i18n";

export function getServerLocale() {
	try {
		const localeFromCookie = cookies().get(LOCALE_COOKIE_KEY)?.value;
		return normalizeLocale(localeFromCookie || DEFAULT_LOCALE);
	} catch {
		return DEFAULT_LOCALE;
	}
}

export function tServer(key, fallback) {
	return getLocaleMessage(getServerLocale(), key, fallback);
}
