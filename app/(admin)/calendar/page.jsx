import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { LocaleText } from "@/components/i18n/locale-text";
import { CrmCalendar } from "@/components/calendar/crm-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildCrmCalendarEvents } from "@/lib/calendar-events";
import { disconnectGoogleCalendar, syncGoogleCalendar } from "@/app/(admin)/calendar/actions";

export const metadata = {
	title: "Calendar - AERIA Hub",
};

export default async function CalendarPage({ searchParams }) {
	const user = await requireUser();
	const events = await buildCrmCalendarEvents();
	const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId: user.id } });
	const params = await searchParams;

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

			<Card>
				<CardHeader>
					<CardTitle>
						<LocaleText
							messageKey="calendar.google.title"
							fallback="Google Calendar"
						/>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center gap-3">
					{connection ? (
						<>
							<p className="text-sm text-muted-foreground">
								<LocaleText
									messageKey="calendar.google.connectedAs"
									fallback="Connected as"
								/>{" "}
								{connection.googleEmail || user.email}
							</p>
							<form action={syncGoogleCalendar}>
								<Button type="submit">
									<LocaleText
										messageKey="calendar.google.sync"
										fallback="Sync CRM events to Google"
									/>
								</Button>
							</form>
							<form action={disconnectGoogleCalendar}>
								<Button
									type="submit"
									variant="outline"
								>
									<LocaleText
										messageKey="calendar.google.disconnect"
										fallback="Disconnect"
									/>
								</Button>
							</form>
							{connection.lastSyncAt && (
								<p className="text-xs text-muted-foreground">
									<LocaleText
										messageKey="calendar.google.lastSync"
										fallback="Last sync"
									/>
									: {new Date(connection.lastSyncAt).toLocaleString()}
								</p>
							)}
							{connection.lastSyncError && <p className="text-xs text-destructive">{connection.lastSyncError}</p>}
						</>
					) : (
						<>
							<p className="text-sm text-muted-foreground">
								<LocaleText
									messageKey="calendar.google.notConnected"
									fallback="Connect Google Calendar to mirror important CRM dates into your primary calendar."
								/>
							</p>
							<Button asChild>
								<a href="/api/google-calendar/connect">
									<LocaleText
										messageKey="calendar.google.connect"
										fallback="Connect Google Calendar"
									/>
								</a>
							</Button>
						</>
					)}

					{params?.google === "connected" && <p className="text-sm text-emerald-600">Google Calendar connected.</p>}
					{params?.google === "connect_error" && (
						<p className="text-sm text-destructive">Google connection failed. Verify OAuth credentials and redirect URI.</p>
					)}
					{params?.google === "state_error" && <p className="text-sm text-destructive">Google OAuth state mismatch. Try again.</p>}
					<p className="text-xs text-muted-foreground">
						<LocaleText
							messageKey="calendar.google.cronHint"
							fallback="For automatic daily sync, call /api/cron/google-calendar-sync with Authorization: Bearer CRON_SECRET."
						/>
					</p>
				</CardContent>
			</Card>

			<CrmCalendar
				initialEvents={events}
				currentUserId={user.id}
			/>
		</div>
	);
}
