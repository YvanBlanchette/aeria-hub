"use client";

import Link from "next/link";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	BriefcaseBusiness,
	Building2,
	CalendarClock,
	CheckCircle2,
	Clock3,
	Database,
	FileText,
	Receipt,
	Shield,
	Users,
	UserCircle,
	KeyRound,
	SlidersHorizontal,
	UserCog,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { ProfileForm } from "@/components/settings/profile-form";
import { ClientProfileRequestForm } from "@/components/settings/client-profile-request-form";
import { PasswordForm } from "@/components/settings/password-form";
import { LanguageForm } from "@/components/settings/language-form";
import { TeamTable } from "@/components/settings/team-table";
import { InviteAgentDialog } from "@/components/settings/invite-agent-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { disconnectGoogleCalendar, syncGoogleCalendar } from "@/app/(admin)/calendar/actions";
import { DatabaseBackupButton } from "@/components/settings/database-backup-button";
import { ImportCsvDialog } from "@/components/clients/import-csv-dialog";
import { ExportCsvMenu } from "@/components/clients/export-csv-menu";
import { TripImportDialog } from "@/components/settings/trip-import-dialog";

export function SettingsTabs({ user, client = null, isAdmin, teamUsers, portalClients = [], workspaceSummary, googleCalendarConnection, googleStatus }) {
	const { t } = useLocale();
	const isClient = user.role === "CLIENT";
	const quickLinks = [
		{ href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: Activity },
		{ href: "/clients", label: t("nav.clients", "Clients"), icon: Users },
		{ href: "/trips", label: t("nav.trips", "Trips"), icon: BriefcaseBusiness },
		{ href: "/commissions", label: t("nav.commissions", "Commissions"), icon: Receipt },
		{ href: "/suppliers", label: t("nav.suppliers", "Suppliers"), icon: Building2 },
	];

	const tabs = [
		{ value: "profile", label: t("settings.tab.profile", "Profile"), icon: UserCircle },
		{ value: "security", label: t("settings.tab.security", "Security"), icon: KeyRound },
		...(!isClient ? [{ value: "system", label: t("settings.tab.system", "System"), icon: SlidersHorizontal }] : []),
		...(isAdmin ? [{ value: "workspace", label: t("settings.tab.workspace", "Workspace"), icon: BriefcaseBusiness }] : []),
		...(isAdmin ? [{ value: "team", label: t("settings.tab.team", "Team"), icon: UserCog }] : []),
	];

	return (
		<Tabs defaultValue="profile">
			<TabsList
				className="w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 shadow-sm"
				variant="default"
			>
				{tabs.map((tab) => {
					const Icon = tab.icon;
					return (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="flex-none gap-2 px-3 py-2 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm"
						>
							<Icon className="size-4" />
							{tab.label}
						</TabsTrigger>
					);
				})}
			</TabsList>

			{/* PROFILE TAB */}
			<TabsContent
				value="profile"
				className="pt-4"
			>
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
					<Card>
						<CardHeader>
							<CardTitle>{t("settings.profile.picture", "Picture")}</CardTitle>
						</CardHeader>
						<CardContent className="flex min-h-36 items-center">
							<AvatarUpload
								name={user.name}
								avatarUrl={user.avatarUrl}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>{isClient ? "Client profile" : t("settings.profile.info", "Profile info")}</CardTitle>
						</CardHeader>
						<CardContent>
							{isClient ? (
								client ? (
									<ClientProfileRequestForm client={client} />
								) : (
									<p className="text-sm text-muted-foreground">No client profile is linked to this account.</p>
								)
							) : (
								<ProfileForm user={user} />
							)}
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			{/* SECURITY TAB */}
			<TabsContent
				value="security"
				className="pt-4"
			>
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>{t("settings.security.password", "Password")}</CardTitle>
							<CardDescription>{t("settings.security.passwordDesc", "Update your credentials regularly and avoid reuse across tools.")}</CardDescription>
						</CardHeader>
						<CardContent>
							<PasswordForm />
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			{/* SYSTEM TAB */}
			{!isClient && (
				<TabsContent
					value="system"
					className="space-y-4 pt-4"
				>
					<Card>
						<CardHeader>
							<CardTitle>{t("calendar.google.title", "Google Calendar")}</CardTitle>
							<CardDescription>
								{t("calendar.google.notConnected", "Connect Google Calendar to mirror important CRM dates into your primary calendar.")}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-3">
							{googleCalendarConnection ? (
								<>
									<p className="text-sm text-muted-foreground">
										{t("calendar.google.connectedAs", "Connected as")} {googleCalendarConnection.googleEmail || user.email}
									</p>
									<form action={syncGoogleCalendar}>
										<Button type="submit">{t("calendar.google.sync", "Sync CRM events to Google")}</Button>
									</form>
									<form action={disconnectGoogleCalendar}>
										<Button
											type="submit"
											variant="outline"
										>
											{t("calendar.google.disconnect", "Disconnect")}
										</Button>
									</form>
									{googleCalendarConnection.lastSyncAt && (
										<p className="text-xs text-muted-foreground">
											{t("calendar.google.lastSync", "Last sync")}: {formatDate(googleCalendarConnection.lastSyncAt)}
										</p>
									)}
									{googleCalendarConnection.lastSyncError && <p className="text-xs text-destructive">{googleCalendarConnection.lastSyncError}</p>}
								</>
							) : (
								<Button asChild>
									<a href="/api/google-calendar/connect">{t("calendar.google.connect", "Connect Google Calendar")}</a>
								</Button>
							)}

							{googleStatus === "connected" && <p className="text-sm text-emerald-600">Google Calendar connected.</p>}
							{googleStatus === "connect_error" && (
								<p className="text-sm text-destructive">Google connection failed. Verify OAuth credentials and redirect URI.</p>
							)}
							{googleStatus === "state_error" && <p className="text-sm text-destructive">Google OAuth state mismatch. Try again.</p>}

							<p className="text-xs text-muted-foreground">
								{t("calendar.google.cronHint", "For automatic daily sync, call /api/cron/google-calendar-sync with Authorization: Bearer CRON_SECRET.")}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t("settings.language.title", "Language")}</CardTitle>
							<CardDescription>{t("settings.language.description", "Choose the application display language.")}</CardDescription>
						</CardHeader>
						<CardContent>
							<LanguageForm />
						</CardContent>
					</Card>

					{isAdmin && (
						<>
							<Card>
								<CardHeader>
									<CardTitle>{t("settings.system.backup", "Database backup")}</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-wrap items-center justify-between gap-3">
									<p className="text-sm text-muted-foreground">Download a complete PostgreSQL backup of this workspace.</p>
									<DatabaseBackupButton />
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Data import and export</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-wrap gap-2">
									<ImportCsvDialog />
									<ExportCsvMenu />
									<TripImportDialog />
									<Button
										variant="outline"
										asChild
									>
										<a
											href="/api/trips/export"
											download
										>
											Download trips CSV
										</a>
									</Button>
								</CardContent>
							</Card>
						</>
					)}

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>{t("settings.system.behavior", "System behavior")}</CardTitle>
								<CardDescription>{t("settings.system.behaviorDesc", "How key CRM data is interpreted and displayed.")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="rounded-lg border border-border p-3">
									<p className="font-medium">{t("settings.system.rule1Title", "Date and time normalization")}</p>
									<p className="mt-1 text-muted-foreground">
										{t("settings.system.rule1Body", "Date formatting is standardized to UTC for consistency across environments.")}
									</p>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="font-medium">{t("settings.system.rule2Title", "Financial precision")}</p>
									<p className="mt-1 text-muted-foreground">
										{t("settings.system.rule2Body", "Currency values are stored as integer cents to avoid floating-point drift.")}
									</p>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="font-medium">{t("settings.system.rule3Title", "Document privacy")}</p>
									<p className="mt-1 text-muted-foreground">
										{t("settings.system.rule3Body", "Uploaded files are stored privately and served through authenticated API routes.")}
									</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("settings.system.playbook", "Operational playbook")}</CardTitle>
								<CardDescription>{t("settings.system.playbookDesc", "Suggested cadence for CRM maintenance.")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="flex items-start gap-2 rounded-lg border border-border p-3">
									<Shield className="mt-0.5 size-4 text-primary" />
									<div>
										<p className="font-medium">{t("settings.system.weekly", "Weekly")}</p>
										<p className="text-muted-foreground">{t("settings.system.weeklyBody", "Review overdue tasks/reminders and role assignments.")}</p>
									</div>
								</div>
								<div className="flex items-start gap-2 rounded-lg border border-border p-3">
									<Database className="mt-0.5 size-4 text-primary" />
									<div>
										<p className="font-medium">{t("settings.system.monthly", "Monthly")}</p>
										<p className="text-muted-foreground">
											{t("settings.system.monthlyBody", "Audit open invoice balances, pending commissions, and stale inquiries.")}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-2 rounded-lg border border-border p-3">
									<FileText className="mt-0.5 size-4 text-primary" />
									<div>
										<p className="font-medium">{t("settings.system.departureCycle", "Per departure cycle")}</p>
										<p className="text-muted-foreground">
											{t("settings.system.departureCycleBody", "Validate traveler documents and reminder queues before final payment windows.")}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			)}

			{/* WORKSPACE TAB */}
			{isAdmin && workspaceSummary && (
				<TabsContent
					value="workspace"
					className="space-y-4 pt-4"
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard
							label={t("settings.workspace.teamMembers", "Team members")}
							value={workspaceSummary.teamCount}
							icon={Users}
						/>
						<StatCard
							label={t("settings.workspace.admins", "Admins")}
							value={workspaceSummary.adminCount}
							icon={Shield}
						/>
						<StatCard
							label={t("settings.workspace.activeClients", "Active clients")}
							value={workspaceSummary.activeClients}
							icon={CheckCircle2}
						/>
						<StatCard
							label={t("settings.workspace.activeTrips", "Active trips")}
							value={workspaceSummary.activeTrips}
							icon={BriefcaseBusiness}
						/>
						<StatCard
							label={t("settings.workspace.openTasks", "Open tasks")}
							value={workspaceSummary.openTasks}
							icon={Clock3}
						/>
						<StatCard
							label={t("settings.workspace.openReminders", "Open reminders")}
							value={workspaceSummary.openReminders}
							icon={CalendarClock}
						/>
						<StatCard
							label={t("settings.workspace.openInvoices", "Open invoices")}
							value={workspaceSummary.openInvoices}
							icon={Receipt}
						/>
						<StatCard
							label={t("settings.workspace.suppliers", "Suppliers")}
							value={workspaceSummary.totalSuppliers}
							icon={Building2}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>{t("settings.workspace.finance", "Finance posture")}</CardTitle>
								<CardDescription>{t("settings.workspace.financeDesc", "Collection and payout pressure at a glance.")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.workspace.openInvoiceBalance", "Open invoice balance")}</p>
									<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(workspaceSummary.openInvoiceBalance)}</p>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.workspace.collectedThisMonth", "Collected this month")}</p>
									<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(workspaceSummary.paidThisMonth)}</p>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<span>{t("settings.workspace.pendingCommissions", "Pending commissions")}</span>
									<span className="font-semibold tabular-nums">{formatCurrency(workspaceSummary.pendingCommissions)}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<span>{t("settings.workspace.overdueInvoices", "Overdue invoices")}</span>
									<span className={cn("font-semibold", workspaceSummary.overdueInvoices > 0 && "text-destructive")}>{workspaceSummary.overdueInvoices}</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("settings.workspace.dataHealth", "Data health")}</CardTitle>
								<CardDescription>{t("settings.workspace.dataHealthDesc", "Coverage across client and trip entities.")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>{t("settings.workspace.totalClients", "Total clients")}</span>
									<Badge variant="secondary">{workspaceSummary.totalClients}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>{t("settings.workspace.totalTravelers", "Total travelers")}</span>
									<Badge variant="secondary">{workspaceSummary.totalTravelers}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>{t("settings.workspace.totalTrips", "Total trips")}</span>
									<Badge variant="secondary">{workspaceSummary.totalTrips}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>{t("settings.workspace.departures30d", "Departures in 30 days")}</span>
									<Badge variant="secondary">{workspaceSummary.departures30d}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>{t("settings.workspace.totalDocuments", "Total documents")}</span>
									<Badge variant="secondary">{workspaceSummary.totalDocuments}</Badge>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("settings.workspace.riskWatch", "Risk watch")}</CardTitle>
								<CardDescription>{t("settings.workspace.riskWatchDesc", "Items that can impact service quality immediately.")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<div className="flex items-center gap-2">
										<AlertTriangle className="size-4 text-destructive" />
										<span>{t("settings.workspace.overdueTasks", "Overdue tasks")}</span>
									</div>
									<span className={cn("font-semibold", workspaceSummary.overdueTasks > 0 && "text-destructive")}>{workspaceSummary.overdueTasks}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<div className="flex items-center gap-2">
										<AlertTriangle className="size-4 text-destructive" />
										<span>{t("settings.workspace.overdueReminders", "Overdue reminders")}</span>
									</div>
									<span className={cn("font-semibold", workspaceSummary.overdueReminders > 0 && "text-destructive")}>{workspaceSummary.overdueReminders}</span>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.workspace.quickNav", "Quick navigation")}</p>
									<div className="mt-2 grid grid-cols-2 gap-2">
										{quickLinks.map((link) => (
											<Button
												key={link.href}
												variant="outline"
												size="sm"
												asChild
											>
												<Link href={link.href}>
													<link.icon className="size-4" />
													{link.label}
												</Link>
											</Button>
										))}
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<div>
								<CardTitle>{t("settings.workspace.recentActivity", "Recent workspace activity")}</CardTitle>
								<CardDescription>{t("settings.workspace.recentActivityDesc", "Latest audited edits across users and client records.")}</CardDescription>
							</div>
							<Button
								variant="ghost"
								size="sm"
								asChild
							>
								<Link href="/dashboard">
									{t("settings.workspace.openDashboard", "Open dashboard")}
									<ArrowRight className="size-4" />
								</Link>
							</Button>
						</CardHeader>
						<CardContent className="space-y-2">
							{workspaceSummary.recentActivity.length === 0 ? (
								<p className="text-sm text-muted-foreground">{t("settings.workspace.noActivity", "No activity records yet.")}</p>
							) : (
								workspaceSummary.recentActivity.map((entry) => (
									<div
										key={entry.id}
										className="rounded-lg border border-border p-2.5"
									>
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-medium">{entry.description || `${entry.action} ${entry.entityType}`}</p>
											<span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{entry.user?.name || t("settings.workspace.systemActor", "System")}
											{entry.client ? (
												<>
													{" · "}
													<Link
														href={`/clients/${entry.client.id}`}
														className="underline-offset-2 hover:underline"
													>
														{entry.client.firstName} {entry.client.lastName}
													</Link>
												</>
											) : null}
										</p>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</TabsContent>
			)}

			{/* TEAM TAB */}
			{isAdmin && (
				<TabsContent
					value="team"
					className="space-y-4 pt-4"
				>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<div>
								<CardTitle>{t("settings.team.access", "Team access")}</CardTitle>
								<CardDescription>{t("settings.team.accessDesc", "Invite teammates, assign roles, rotate passwords, and remove accounts.")}</CardDescription>
							</div>
							<InviteAgentDialog />
						</CardHeader>
						<CardContent className="p-0">
							<TeamTable
								users={teamUsers}
								currentUserId={user.id}
								portalClients={portalClients}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t("settings.team.rolePolicy", "Role policy")}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>{t("settings.team.policy1", "Admins can manage users, reset passwords, and change roles.")}</p>
							<p>{t("settings.team.policy2", "Agents can manage client and trip workflows but cannot administer accounts.")}</p>
							<p>{t("settings.team.policy3", "The last remaining admin cannot be removed or downgraded.")}</p>
						</CardContent>
					</Card>
				</TabsContent>
			)}
		</Tabs>
	);
}
