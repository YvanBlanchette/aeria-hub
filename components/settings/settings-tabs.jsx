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
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { TeamTable } from "@/components/settings/team-table";
import { InviteAgentDialog } from "@/components/settings/invite-agent-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SettingsTabs({ user, isAdmin, teamUsers, workspaceSummary }) {
	const quickLinks = [
		{ href: "/dashboard", label: "Dashboard", icon: Activity },
		{ href: "/clients", label: "Clients", icon: Users },
		{ href: "/trips", label: "Trips", icon: BriefcaseBusiness },
		{ href: "/commissions", label: "Commissions", icon: Receipt },
		{ href: "/suppliers", label: "Suppliers", icon: Building2 },
	];

	return (
		<Tabs defaultValue="profile">
			<TabsList variant="line">
				<TabsTrigger value="profile">Profile</TabsTrigger>
				<TabsTrigger value="security">Security</TabsTrigger>
				<TabsTrigger value="appearance">Appearance</TabsTrigger>
				<TabsTrigger value="system">System</TabsTrigger>
				{isAdmin && <TabsTrigger value="workspace">Workspace</TabsTrigger>}
				{isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
			</TabsList>

			{/* PROFILE TAB */}
			<TabsContent
				value="profile"
				className="space-y-6 pt-4"
			>
				<Card>
					<CardHeader>
						<CardTitle>Picture</CardTitle>
					</CardHeader>
					<CardContent>
						<AvatarUpload
							name={user.name}
							avatarUrl={user.avatarUrl}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Profile info</CardTitle>
					</CardHeader>
					<CardContent>
						<ProfileForm user={user} />
					</CardContent>
				</Card>
			</TabsContent>

			{/* SECURITY TAB */}
			<TabsContent
				value="security"
				className="pt-4"
			>
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Password</CardTitle>
							<CardDescription>Update your credentials regularly and avoid reuse across tools.</CardDescription>
						</CardHeader>
						<CardContent>
							<PasswordForm />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Security hygiene</CardTitle>
							<CardDescription>Operational guardrails for account safety and team admin actions.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2.5 text-sm">
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Use unique, high-entropy passwords</p>
								<p className="mt-1 text-muted-foreground">Minimum 8 characters is enforced; use passphrases whenever possible.</p>
							</div>
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Reset teammate passwords on role changes</p>
								<p className="mt-1 text-muted-foreground">Admins can rotate any teammate password in Team settings immediately.</p>
							</div>
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Review activity regularly</p>
								<p className="mt-1 text-muted-foreground">Use Dashboard and Workspace activity logs to detect suspicious edits quickly.</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			{/* APPEARANCE TAB */}
			<TabsContent
				value="appearance"
				className="pt-4"
			>
				<Card>
					<CardHeader>
						<CardTitle>Theme</CardTitle>
					</CardHeader>
					<CardContent>
						<AppearanceForm />
					</CardContent>
				</Card>
			</TabsContent>

			{/* SYSTEM TAB */}
			<TabsContent
				value="system"
				className="space-y-4 pt-4"
			>
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>System behavior</CardTitle>
							<CardDescription>How key CRM data is interpreted and displayed.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2.5 text-sm">
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Date and time normalization</p>
								<p className="mt-1 text-muted-foreground">Date formatting is standardized to UTC for consistency across environments.</p>
							</div>
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Financial precision</p>
								<p className="mt-1 text-muted-foreground">Currency values are stored as integer cents to avoid floating-point drift.</p>
							</div>
							<div className="rounded-lg border border-border p-3">
								<p className="font-medium">Document privacy</p>
								<p className="mt-1 text-muted-foreground">Uploaded files are stored privately and served through authenticated API routes.</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Operational playbook</CardTitle>
							<CardDescription>Suggested cadence for CRM maintenance.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2.5 text-sm">
							<div className="flex items-start gap-2 rounded-lg border border-border p-3">
								<Shield className="mt-0.5 size-4 text-primary" />
								<div>
									<p className="font-medium">Weekly</p>
									<p className="text-muted-foreground">Review overdue tasks/reminders and role assignments.</p>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg border border-border p-3">
								<Database className="mt-0.5 size-4 text-primary" />
								<div>
									<p className="font-medium">Monthly</p>
									<p className="text-muted-foreground">Audit open invoice balances, pending commissions, and stale inquiries.</p>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg border border-border p-3">
								<FileText className="mt-0.5 size-4 text-primary" />
								<div>
									<p className="font-medium">Per departure cycle</p>
									<p className="text-muted-foreground">Validate traveler documents and reminder queues before final payment windows.</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			{/* WORKSPACE TAB */}
			{isAdmin && workspaceSummary && (
				<TabsContent
					value="workspace"
					className="space-y-4 pt-4"
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard
							label="Team members"
							value={workspaceSummary.teamCount}
							icon={Users}
						/>
						<StatCard
							label="Admins"
							value={workspaceSummary.adminCount}
							icon={Shield}
						/>
						<StatCard
							label="Active clients"
							value={workspaceSummary.activeClients}
							icon={CheckCircle2}
						/>
						<StatCard
							label="Active trips"
							value={workspaceSummary.activeTrips}
							icon={BriefcaseBusiness}
						/>
						<StatCard
							label="Open tasks"
							value={workspaceSummary.openTasks}
							icon={Clock3}
						/>
						<StatCard
							label="Open reminders"
							value={workspaceSummary.openReminders}
							icon={CalendarClock}
						/>
						<StatCard
							label="Open invoices"
							value={workspaceSummary.openInvoices}
							icon={Receipt}
						/>
						<StatCard
							label="Suppliers"
							value={workspaceSummary.totalSuppliers}
							icon={Building2}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>Finance posture</CardTitle>
								<CardDescription>Collection and payout pressure at a glance.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">Open invoice balance</p>
									<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(workspaceSummary.openInvoiceBalance)}</p>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">Collected this month</p>
									<p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(workspaceSummary.paidThisMonth)}</p>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<span>Pending commissions</span>
									<span className="font-semibold tabular-nums">{formatCurrency(workspaceSummary.pendingCommissions)}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<span>Overdue invoices</span>
									<span className={cn("font-semibold", workspaceSummary.overdueInvoices > 0 && "text-destructive")}>{workspaceSummary.overdueInvoices}</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Data health</CardTitle>
								<CardDescription>Coverage across client and trip entities.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>Total clients</span>
									<Badge variant="secondary">{workspaceSummary.totalClients}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>Total travelers</span>
									<Badge variant="secondary">{workspaceSummary.totalTravelers}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>Total trips</span>
									<Badge variant="secondary">{workspaceSummary.totalTrips}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>Departures in 30 days</span>
									<Badge variant="secondary">{workspaceSummary.departures30d}</Badge>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-2.5">
									<span>Total documents</span>
									<Badge variant="secondary">{workspaceSummary.totalDocuments}</Badge>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Risk watch</CardTitle>
								<CardDescription>Items that can impact service quality immediately.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5 text-sm">
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<div className="flex items-center gap-2">
										<AlertTriangle className="size-4 text-destructive" />
										<span>Overdue tasks</span>
									</div>
									<span className={cn("font-semibold", workspaceSummary.overdueTasks > 0 && "text-destructive")}>{workspaceSummary.overdueTasks}</span>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-border p-3">
									<div className="flex items-center gap-2">
										<AlertTriangle className="size-4 text-destructive" />
										<span>Overdue reminders</span>
									</div>
									<span className={cn("font-semibold", workspaceSummary.overdueReminders > 0 && "text-destructive")}>{workspaceSummary.overdueReminders}</span>
								</div>
								<div className="rounded-lg border border-border p-3">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">Quick navigation</p>
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
								<CardTitle>Recent workspace activity</CardTitle>
								<CardDescription>Latest audited edits across users and client records.</CardDescription>
							</div>
							<Button
								variant="ghost"
								size="sm"
								asChild
							>
								<Link href="/dashboard">
									Open dashboard
									<ArrowRight className="size-4" />
								</Link>
							</Button>
						</CardHeader>
						<CardContent className="space-y-2">
							{workspaceSummary.recentActivity.length === 0 ? (
								<p className="text-sm text-muted-foreground">No activity records yet.</p>
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
											{entry.user?.name || "System"}
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
								<CardTitle>Team access</CardTitle>
								<CardDescription>Invite teammates, assign roles, rotate passwords, and remove accounts.</CardDescription>
							</div>
							<InviteAgentDialog />
						</CardHeader>
						<CardContent>
							<TeamTable
								users={teamUsers}
								currentUserId={user.id}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Role policy</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>Admins can manage users, reset passwords, and change roles.</p>
							<p>Agents can manage client and trip workflows but cannot administer accounts.</p>
							<p>The last remaining admin cannot be removed or downgraded.</p>
						</CardContent>
					</Card>
				</TabsContent>
			)}
		</Tabs>
	);
}
