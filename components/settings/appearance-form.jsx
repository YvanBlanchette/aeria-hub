"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";

export function AppearanceForm() {
	const { theme, setTheme } = useTheme();
	const { t } = useLocale();
	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
	const [accent, setAccent] = useState(() => (typeof window === "undefined" ? "ocean" : window.localStorage.getItem("aeria-accent") || "ocean"));

	useEffect(() => {
		document.documentElement.dataset.accent = accent;
	}, [accent]);

	function changeAccent(value) {
		setAccent(value);
		window.localStorage.setItem("aeria-accent", value);
	}

	const accents = [
		{ value: "ocean", label: "Ocean", color: "#0e4f6a" },
		{ value: "forest", label: "Forest", color: "#2f6b54" },
		{ value: "plum", label: "Plum", color: "#6b466f" },
		{ value: "terracotta", label: "Terracotta", color: "#b45f3c" },
	];

	return (
		<div className="grid max-w-2xl gap-8 md:grid-cols-2">
			<div className="space-y-2">
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

			<div className="space-y-3">
				<div>
					<Label>{t("settings.appearance.accent", "Accent color")}</Label>
					<p className="mt-1 text-xs text-muted-foreground">Choose the color used for navigation and primary actions.</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{accents.map((option) => (
						<Button
							key={option.value}
							type="button"
							variant="outline"
							size="sm"
							onClick={() => changeAccent(option.value)}
							className="gap-2"
						>
							<span
								className="size-3 rounded-full"
								style={{ backgroundColor: option.color }}
							/>
							{option.label}
							{accent === option.value && <Check className="size-3.5" />}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
