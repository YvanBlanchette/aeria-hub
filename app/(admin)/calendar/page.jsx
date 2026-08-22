import { requireUser } from "@/lib/session";
import { CrmCalendar } from "@/components/calendar/crm-calendar";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";
import { getClientPortalRecord } from "@/lib/client-portal";

export const metadata = {
	title: "Calendar | AERIA Hub",
};

export default async function CalendarPage() {
	const user = await requireUser();
	if (user.role === "CLIENT") {
		const portal = await getClientPortalRecord(user);
		if (!portal) {
			return <div className="p-6 text-muted-foreground">No client profile found for this account.</div>;
		}

		const now = new Date();
		const future = new Date(now);
		future.setDate(now.getDate() + 120);
		const events = await buildCrmCalendarEvents({ user: { ...user, role: "CLIENT" }, from: now, to: future });
		const clientOnlyEvents = events.filter((event) => {
			const clientName = `${portal.client.firstName} ${portal.client.lastName}`.trim();
			return event.clientName === clientName;
		});

		return (
			<div className="space-y-6">
				<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
					<div>
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Trip timeline</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">My travel calendar</h1>
					</div>
				</div>
				<CrmCalendar
					initialEvents={clientOnlyEvents}
					currentUserId={user.id}
				/>
			</div>
		);
	}

	const events = await buildCrmCalendarEvents({ user });

	return (
		<div className="space-y-6">
			{/* <div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="space-y-2">
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
						<LocaleText
							messageKey="calendar.kicker"
							fallback="Operations timeline"
						/>
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
						<LocaleText
							messageKey="calendar.title"
							fallback="Calendar"
						/>
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						<LocaleText
							messageKey="calendar.subtitle"
							fallback="Track client vacations, final payment windows, reminders, and invoice deadlines in one view."
						/>
					</p>
				</div>
			</div> */}

			<CrmCalendar
				initialEvents={events}
				currentUserId={user.id}
			/>
		</div>
	);
}
