"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, getLocaleMessage, LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/i18n";

const LocaleContext = createContext(null);

function detectInitialLocale() {
	if (typeof window === "undefined") return DEFAULT_LOCALE;

	const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
	if (stored) return normalizeLocale(stored);

	const browserLocale = window.navigator.language?.toLowerCase() || "";
	if (browserLocale.startsWith("fr")) return "fr";
	return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }) {
	const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

	useEffect(() => {
		setLocaleState(detectInitialLocale());
	}, []);

	const setLocale = useCallback((nextLocale) => {
		const normalized = normalizeLocale(nextLocale);
		setLocaleState(normalized);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
		document.documentElement.lang = locale;
		document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
	}, [locale]);

	const t = useCallback(
		(key, fallback) => {
			return getLocaleMessage(locale, key, fallback);
		},
		[locale],
	);

	const value = useMemo(
		() => ({
			locale,
			setLocale,
			t,
		}),
		[locale, setLocale, t],
	);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
	const value = useContext(LocaleContext);
	if (!value) {
		throw new Error("useLocale must be used within LocaleProvider");
	}
	return value;
}
