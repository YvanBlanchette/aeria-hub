import Link from "next/link";
import { ArrowRight, Sparkles, Users, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableField } from "@/components/clients/copyable-field";
import { PROFILES } from "@/lib/aeria-travel-profiles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Full "My Travel Profile" view for a logged-in client: contact/passport
 * info, travel companions, loyalty programs, and their AERIA quiz result
 * (if they've completed it) or a prompt to take it.
 */
export function TravelProfileOverview({ client, onRetakeQuiz }) {
	const primaryProfile = client.aeriaProfilePrimary ? PROFILES[client.aeriaProfilePrimary] : null;
	const secondaryProfile = client.aeriaProfileSecondary ? PROFILES[client.aeriaProfileSecondary] : null;

	return (
		<div className="space-y-6">
			{/* AERIA PROFILE RESULT */}
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="size-4" />
						Your AERIA travel profile
					</CardTitle>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onRetakeQuiz}
					>
						{primaryProfile ? "Retake the quiz" : "Take the quiz"}
					</Button>
				</CardHeader>
				<CardContent>
					{primaryProfile ? (
						<div className="space-y-5">
							<div className="grid gap-4 md:grid-cols-2">
								<div className={cn("rounded-md border p-4", primaryProfile.color)}>
									<p className="text-xs font-medium uppercase tracking-[0.22em] opacity-70">Dominant profile</p>
									<div className="mt-2 flex items-center gap-2">
										<span className={cn("size-2.5 rounded-full", primaryProfile.accent)} />
										<p className="text-xl font-semibold">{primaryProfile.name}</p>
									</div>
									<p className="mt-3 text-sm leading-6">{primaryProfile.tagline}</p>
								</div>
								{secondaryProfile && (
									<div className="rounded-md border border-border bg-background p-4">
										<p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Secondary profile</p>
										<p className="mt-2 text-lg font-semibold">{secondaryProfile.name}</p>
										<p className="mt-2 text-sm leading-6 text-muted-foreground">{secondaryProfile.tagline}</p>
									</div>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								{primaryProfile.keywords.map((keyword) => (
									<Badge
										key={keyword}
										variant="secondary"
									>
										{keyword}
									</Badge>
								))}
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended for you</p>
								<ul className="mt-2 space-y-1 text-sm text-muted-foreground">
									{primaryProfile.recommendations.map((item) => (
										<li key={item}>• {item}</li>
									))}
								</ul>
							</div>
							{client.aeriaProfileCompletedAt && <p className="text-xs text-muted-foreground">Completed on {formatDate(client.aeriaProfileCompletedAt)}.</p>}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							You haven't taken the AERIA travel-personality quiz yet. Take the 2-minute quiz to help your advisor tailor recommendations to your style.
						</p>
					)}
				</CardContent>
			</Card>

			{/* CONTACT & ADDRESS */}
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Contact & address</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="First name"
							value={client.firstName}
						/>
						<CopyableField
							label="Last name"
							value={client.lastName}
						/>
						<CopyableField
							label="Date of birth"
							value={client.dateOfBirth ? formatDate(client.dateOfBirth) : null}
						/>
						<CopyableField
							label="Primary email"
							value={client.primaryEmail}
						/>
						<CopyableField
							label="Primary phone"
							value={client.primaryPhone}
						/>
						<CopyableField
							label="Secondary phone"
							value={client.secondaryPhone}
						/>
						<CopyableField
							label="Address"
							value={client.address}
						/>
						<CopyableField
							label="City"
							value={client.city}
						/>
						<CopyableField
							label="Postal / ZIP code"
							value={client.postalCode}
						/>
						<CopyableField
							label="Province / State"
							value={client.stateProvince}
						/>
						<CopyableField
							label="Country"
							value={client.country}
						/>
					</dl>
				</CardContent>
			</Card>

			{/* TRAVEL DOCUMENTS */}
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Travel documents</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="Nationality"
							value={client.nationality}
						/>
						<CopyableField
							label="Passport number"
							value={client.passportNumber}
						/>
						<CopyableField
							label="Passport issue date"
							value={client.passportIssueDate ? formatDate(client.passportIssueDate) : null}
						/>
						<CopyableField
							label="Passport expiry"
							value={client.passportExpiry ? formatDate(client.passportExpiry) : null}
						/>
						<CopyableField
							label="Known Traveler Number"
							value={client.knownTravelerNumber}
						/>
						<CopyableField
							label="Redress number"
							value={client.redressNumber}
						/>
					</dl>
				</CardContent>
			</Card>

			{/* PREFERENCES & NOTES */}
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Preferences & notes</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<CopyableField
							label="Travel preferences"
							value={client.travelPreferences}
						/>
						<CopyableField
							label="Dietary notes"
							value={client.dietaryNotes}
						/>
						<CopyableField
							label="Mobility notes"
							value={client.mobilityNotes}
						/>
					</dl>
				</CardContent>
			</Card>

			{/* TRAVELERS */}
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center gap-2">
					<Users className="size-4" />
					<CardTitle>Travel companions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{client.travelers?.length ? (
						client.travelers.map((traveler) => (
							<div
								key={traveler.id}
								className="rounded-lg border border-border p-3 text-sm"
							>
								<p className="font-medium">
									{traveler.firstName} {traveler.lastName}
								</p>
								<p className="text-muted-foreground">{traveler.relationshipToClient || "Companion"}</p>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">No travel companions on file yet.</p>
					)}
				</CardContent>
			</Card>

			{/* LOYALTY PROGRAMS */}
			<Card className="p-0">
				<CardHeader className="flex flex-row items-center gap-2">
					<Award className="size-4" />
					<CardTitle>Loyalty programs</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{client.loyaltyPrograms?.length ? (
						client.loyaltyPrograms.map((program) => (
							<div
								key={program.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
							>
								<span className="font-medium">{program.programName}</span>
								<span className="text-muted-foreground">{program.memberNumber}</span>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">No loyalty programs on file yet.</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-wrap items-center justify-between gap-3">
					<CardDescription>Something out of date? Request an update and your advisor will review the changes.</CardDescription>
					<Button
						variant="outline"
						size="sm"
						asChild
					>
						<Link href="/settings">
							Request changes <ArrowRight className="size-4" />
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
