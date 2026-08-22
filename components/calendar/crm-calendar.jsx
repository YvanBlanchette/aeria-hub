"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/format";

function dayKey(date) {
	return new Date(date).toISOString().slice(0, 10);
}

function eachDay(start, end) {
	const list = [];
	const current = new Date(start);
	current.setHours(0, 0, 0, 0);
	const final = new Date(end);
	final.setHours(0, 0, 0, 0);

	while (current <= final) {
		list.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}

	return list;
}

function monthGrid(baseDate) {
	const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
	const start = new Date(first);
	start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

	return Array.from({ length: 42 }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});
}

const TYPE_COLORS = {
	vacation: "default",
	finalPayment: "destructive",
	reminder: "secondary",
	invoiceDue: "outline",
};

export function CrmCalendar({ initialEvents, currentUserId }) {
	const { t } = useLocale();
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [displayMonth, setDisplayMonth] = useState(new Date());
	const [filters, setFilters] = useState({
		vacation: true,
		finalPayment: true,
		reminder: true,
		invoiceDue: true,
		clientQuery: "",
		agentId: "all",
		tripStatus: "all",
	});

	const agentOptions = useMemo(() => {
		const map = new Map();
		for (const e of initialEvents) {
			if (e.assignedAgentId) {
				map.set(e.assignedAgentId, e.assignedAgentName || e.assignedAgentId);
			}
		}
		return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
	}, [initialEvents]);

	const activeEvents = useMemo(() => {
		return initialEvents.filter((e) => {
			if (!filters[e.type]) return false;

			if (filters.clientQuery.trim()) {
				const query = filters.clientQuery.trim().toLowerCase();
				const haystack = `${e.clientName || ""} ${e.title || ""} ${e.description || ""}`.toLowerCase();
				if (!haystack.includes(query)) return false;
			}

			if (filters.agentId === "me" && e.assignedAgentId !== currentUserId) return false;
			if (filters.agentId === "unassigned" && e.assignedAgentId) return false;
			if (filters.agentId !== "all" && filters.agentId !== "me" && filters.agentId !== "unassigned" && e.assignedAgentId !== filters.agentId) {
				return false;
			}

			if (filters.tripStatus !== "all") {
				const tripEvent = e.type === "vacation" || e.type === "finalPayment";
				if (!tripEvent) return false;
				if (e.tripStatus !== filters.tripStatus) return false;
			}

			return true;
		});
	}, [initialEvents, filters, currentUserId]);

	const eventsByDay = useMemo(() => {
		const map = new Map();

		for (const event of activeEvents) {
			const dates = eachDay(event.startDate, event.endDate || event.startDate);
			for (const d of dates) {
				const key = dayKey(d);
				if (!map.has(key)) map.set(key, []);
				map.get(key).push(event);
			}
		}

		return map;
	}, [activeEvents]);

	const selectedKey = dayKey(selectedDate);
	const selectedEvents = eventsByDay.get(selectedKey) || [];
	const gridDays = monthGrid(displayMonth);

	function toggleFilter(key, checked) {
		setFilters((prev) => ({ ...prev, [key]: Boolean(checked) }));
	}

	function eventTypeLabel(type) {
		if (type === "vacation") return t("calendar.filters.vacations", "Clients on vacation");
		if (type === "finalPayment") return t("calendar.filters.finalPayments", "Final payment dates");
		if (type === "invoiceDue") return t("calendar.filters.invoiceDue", "Invoice due dates");
		return t("calendar.filters.reminders", "Reminders");
	}

	return (
		<div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle className="text-xl capitalize sm:text-2xl">{displayMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</CardTitle>
					<div className="flex items-center gap-2 rounded-xl  p-1 ">
						<Button
							variant="ghost"
							size="icon-sm"
							title={t("calendar.prevMonth", "Previous month")}
							aria-label={t("calendar.prevMonth", "Previous month")}
							onClick={() => setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							title={t("calendar.nextMonth", "Next month")}
							aria-label={t("calendar.nextMonth", "Next month")}
							onClick={() => setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
						{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
							<div key={d}>{d}</div>
						))}
					</div>
					<div className="grid grid-cols-7 gap-1">
						{gridDays.map((d) => {
							const key = dayKey(d);
							const inCurrentMonth = d.getMonth() === displayMonth.getMonth();
							const dayEvents = eventsByDay.get(key) || [];
							const isSelected = key === selectedKey;

							return (
								<button
									key={key}
									type="button"
									onClick={() => setSelectedDate(d)}
									className={`min-h-20 rounded-md border p-1 text-left transition ${isSelected ? "border-primary bg-primary/5" : "border-border"} ${inCurrentMonth ? "" : "opacity-45"}`}
								>
									<div className="text-xs font-medium">{d.getDate()}</div>
									<div className="mt-1 space-y-1">
										{dayEvents.slice(0, 2).map((event, idx) => (
											<div
												key={`${event.id}-${idx}`}
												className="truncate rounded bg-muted px-1 py-0.5 text-[10px]"
											>
												{event.title}
											</div>
										))}
										{dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>}
									</div>
								</button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>{t("calendar.filters.title", "Filters")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<Label htmlFor="calendar-client-query">{t("calendar.filters.client", "Client or title")}</Label>
							<Input
								id="calendar-client-query"
								value={filters.clientQuery}
								onChange={(e) => setFilters((prev) => ({ ...prev, clientQuery: e.target.value }))}
								placeholder={t("calendar.filters.clientPlaceholder", "Search client, trip, invoice...")}
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="calendar-agent-filter">{t("calendar.filters.agent", "Assigned agent")}</Label>
							<select
								id="calendar-agent-filter"
								value={filters.agentId}
								onChange={(e) => setFilters((prev) => ({ ...prev, agentId: e.target.value }))}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="all">{t("calendar.filters.allAgents", "All agents")}</option>
								<option value="me">{t("calendar.filters.myEvents", "My clients")}</option>
								<option value="unassigned">{t("calendar.filters.unassigned", "Unassigned")}</option>
								{agentOptions.map((agent) => (
									<option
										key={agent.id}
										value={agent.id}
									>
										{agent.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1">
							<Label htmlFor="calendar-trip-status">{t("calendar.filters.tripStatus", "Trip status")}</Label>
							<select
								id="calendar-trip-status"
								value={filters.tripStatus}
								onChange={(e) => setFilters((prev) => ({ ...prev, tripStatus: e.target.value }))}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="all">{t("calendar.filters.allTripStatuses", "All trip statuses")}</option>
								<option value="INQUIRY">{t("trips.status.inquiry", "Inquiry")}</option>
								<option value="QUOTED">{t("trips.status.quoted", "Quoted")}</option>
								<option value="BOOKED">{t("trips.status.booked", "Booked")}</option>
								<option value="TRAVELING">{t("trips.status.traveling", "Traveling")}</option>
								<option value="COMPLETED">{t("trips.status.completed", "Completed")}</option>
								<option value="CANCELLED">{t("trips.status.cancelled", "Cancelled")}</option>
							</select>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={filters.vacation}
								onCheckedChange={(v) => toggleFilter("vacation", v)}
							/>
							{t("calendar.filters.vacations", "Clients on vacation")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={filters.finalPayment}
								onCheckedChange={(v) => toggleFilter("finalPayment", v)}
							/>
							{t("calendar.filters.finalPayments", "Final payment dates")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={filters.invoiceDue}
								onCheckedChange={(v) => toggleFilter("invoiceDue", v)}
							/>
							{t("calendar.filters.invoiceDue", "Invoice due dates")}
						</label>
						<label className="flex items-center gap-2 text-sm">
							<Checkbox
								checked={filters.reminder}
								onCheckedChange={(v) => toggleFilter("reminder", v)}
							/>
							{t("calendar.filters.reminders", "Reminders")}
						</label>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{t("calendar.events", "Events")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-sm font-medium">{formatDate(selectedDate)}</p>
						{selectedEvents.length === 0 ? (
							<p className="text-sm text-muted-foreground">{t("calendar.emptyDay", "No important events for this day.")}</p>
						) : (
							<div className="space-y-2">
								{selectedEvents.map((event) => (
									<div
										key={event.id}
										className="rounded-md border border-border p-2"
									>
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-medium">{event.title}</p>
											<Badge variant={TYPE_COLORS[event.type] || "secondary"}>{eventTypeLabel(event.type)}</Badge>
										</div>
										{event.clientName && <p className="text-xs text-muted-foreground">{event.clientName}</p>}
										{event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
