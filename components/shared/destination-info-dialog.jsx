"use client";

import { useState } from "react";
import { Loader2Icon, MapPinIcon, ThermometerIcon, ExternalLinkIcon, DropletIcon, WindIcon, CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Click-to-open modal showing destination info (overview + current weather)
 * for a trip segment's location. Fetched lazily on first open and cached
 * per-location for the component's lifetime.
 * @param {string} location
 * @param {string | Date | null} [date] Trip date, used to compute typical weather for that time of year.
 */
export function DestinationInfoDialog({ location, date, children }) {
	const [open, setOpen] = useState(false);
	const [state, setState] = useState({ status: "idle", data: null, error: null });

	function handleOpenChange(nextOpen) {
		setOpen(nextOpen);
		if (nextOpen && state.status === "idle") {
			setState({ status: "loading", data: null, error: null });
			const params = new URLSearchParams({ location });
			if (date) params.set("date", new Date(date).toISOString());
			fetch(`/api/destinations/info?${params.toString()}`)
				.then((res) => {
					if (!res.ok) throw new Error("Request failed");
					return res.json();
				})
				.then((data) => setState({ status: "ready", data, error: null }))
				.catch(() => setState({ status: "error", data: null, error: "Unable to load destination info." }));
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={handleOpenChange}
		>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MapPinIcon className="size-4" />
						{location}
					</DialogTitle>
					<DialogDescription>Destination overview and current weather</DialogDescription>
				</DialogHeader>

				{/* LOADING */}
				{state.status === "loading" && (
					<div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
						<Loader2Icon className="size-4 animate-spin" />
						Loading destination info…
					</div>
				)}

				{/* ERROR */}
				{state.status === "error" && <p className="py-4 text-sm text-muted-foreground">{state.error}</p>}

				{/* READY */}
				{state.status === "ready" && (
					<div className="space-y-4">
						{state.data?.overview?.thumbnail && (
							// eslint-disable-next-line @next/next/no-img-element -- arbitrary external Wikipedia host, not worth an image-optimizer allowlist entry
							<img
								src={state.data.overview.thumbnail}
								alt={state.data.overview.title || location}
								className="h-40 w-full rounded-lg object-cover"
							/>
						)}

						{/* WEATHER */}
						{state.data?.weather ? (
							<div className="rounded-lg border border-border p-3">
								<div className="flex items-center gap-2 text-sm font-medium capitalize">
									<ThermometerIcon className="size-4 text-primary" />
									{Math.round(state.data.weather.tempC)}°C · {state.data.weather.description}
								</div>
								<div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
									{state.data.weather.humidity != null && (
										<span className="flex items-center gap-1">
											<DropletIcon className="size-3.5" />
											{state.data.weather.humidity}% humidity
										</span>
									)}
									{state.data.weather.windKph != null && (
										<span className="flex items-center gap-1">
											<WindIcon className="size-3.5" />
											{state.data.weather.windKph} km/h
										</span>
									)}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">Current conditions — actual weather during your trip may differ.</p>
							</div>
						) : (
							!state.data?.typicalWeather && <p className="text-xs text-muted-foreground">Weather data isn&apos;t available for this destination.</p>
						)}

						{/* TYPICAL WEATHER FOR THIS TIME OF YEAR */}
						{state.data?.typicalWeather && (
							<div className="rounded-lg border border-border p-3">
								<div className="flex items-center gap-2 text-sm font-medium capitalize">
									<CalendarIcon className="size-4 text-primary" />
									Typically {Math.round(state.data.typicalWeather.tempMinC)}°–{Math.round(state.data.typicalWeather.tempMaxC)}°C
									{state.data.typicalWeather.description ? ` · ${state.data.typicalWeather.description}` : ""}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									Average of the last {state.data.typicalWeather.yearsSampled} year{state.data.typicalWeather.yearsSampled === 1 ? "" : "s"} for this time of
									year — data:{" "}
									<a
										href="https://open-meteo.com/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline underline-offset-2"
									>
										Open-Meteo.com
									</a>
								</p>
							</div>
						)}

						{/* OVERVIEW */}
						{state.data?.overview?.extract && <p className="text-sm leading-6 text-muted-foreground">{state.data.overview.extract}</p>}

						{/* THINGS TO DO */}
						{Array.isArray(state.data?.overview?.thingsToDo) && state.data.overview.thingsToDo.length > 0 && (
							<div className="space-y-2">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Things to do</p>
								<ul className="space-y-2">
									{state.data.overview.thingsToDo.slice(0, 5).map((item) => (
										<li
											key={item.name}
											className="rounded-lg border border-border p-2.5 text-sm"
										>
											<p className="font-medium">{item.name}</p>
											{item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
										</li>
									))}
								</ul>
							</div>
						)}

						{/* LINKS */}
						<div className="flex flex-wrap gap-2">
							{!state.data?.overview?.thingsToDo && state.data?.thingsToDoUrl && (
								<Button
									asChild
									variant="outline"
									size="sm"
								>
									<a
										href={state.data.thingsToDoUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										Things to do
										<ExternalLinkIcon className="size-3.5" />
									</a>
								</Button>
							)}
							{state.data?.overview?.sourceUrl && (
								<Button
									asChild
									variant="outline"
									size="sm"
								>
									<a
										href={state.data.overview.sourceUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										{state.data.overview.sourceLabel || "Source"}
										<ExternalLinkIcon className="size-3.5" />
									</a>
								</Button>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
