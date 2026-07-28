import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { LocaleText } from "@/components/i18n/locale-text";
import { CrmCalendar } from "@/components/calendar/crm-calendar";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";

export const metadata = {
	title: "Calendar - AERIA Hub",
};

export default async function CalendarPage() {
	const user = await requireUser();
	const events = await buildCrmCalendarEvents();

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
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
			</div>

			<CrmCalendar
				initialEvents={events}
				currentUserId={user.id}
			/>
		</div>
	);
}
