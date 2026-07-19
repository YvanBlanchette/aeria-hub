import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyableField } from "@/components/clients/copyable-field";
import { CopyableText } from "@/components/clients/copyable-text";
import { LoyaltyProgramFormDialog } from "@/components/clients/loyalty-program-form-dialog";
import { DeleteLoyaltyProgramButton } from "@/components/clients/delete-loyalty-program-button";
import { formatDate } from "@/lib/format";

export default async function ClientProfilePage({ params }) {
	const { clientId } = await params;

	const client = await prisma.client.findUnique({ where: { id: clientId } });
	if (!client) notFound();

	const [loyaltyPrograms, activity] = await Promise.all([
		prisma.loyaltyProgram.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } }),
		prisma.activityLog.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
			take: 10,
			include: { user: { select: { name: true } } },
		}),
	]);

	return (
		<div className="space-y-6">
			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Contact & address</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="First Name"
							value={client.firstName}
						/>
						<CopyableField
							label="Last Name"
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
						{/* <CopyableField
							label="Secondary email"
							value={client.secondaryEmail}
						/> */}
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

			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Travel details</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<CopyableField
							label="Passport number"
							value={client.passportNumber}
						/>
						<CopyableField
							label="Passport issue date"
							value={client.passportIssueDate ? formatDate(client.passportIssueDate) : null}
						/>
						<CopyableField
							label="Passport expiry date"
							value={client.passportExpiry ? formatDate(client.passportExpiry) : null}
						/>
						<CopyableField
							label="Nationality"
							value={client.nationality}
						/>
						<CopyableField
							label="Redress number"
							value={client.redressNumber}
						/>
						<CopyableField
							label="Known Traveler Number"
							value={client.knownTravelerNumber}
						/>
					</dl>
				</CardContent>
			</Card>

			<Card className="py-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Preferences & notes</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6 px-0 pb-0">
					<dl className="grid grid-cols-1 gap-4 md:grid-cols-3 px-4">
						<CopyableField
							label="Travel preferences"
							value={client.travelPreferences}
						/>
						<CopyableField
							label="Dietary / medical notes"
							value={client.dietaryNotes}
						/>
						<CopyableField
							label="Mobility notes"
							value={client.mobilityNotes}
						/>
					</dl>

					<div className="space-y-3 border-t border-border pt-6">
						<div className="flex items-center justify-between px-4">
							<h3 className="text-sm font-medium">Loyalty programs</h3>
							<LoyaltyProgramFormDialog
								clientId={clientId}
								trigger={
									<Button
										size="sm"
										variant="outline"
									>
										<Plus className="size-4" />
										Add loyalty program
									</Button>
								}
							/>
						</div>

						{loyaltyPrograms.length === 0 ? (
							<p className="text-sm text-muted-foreground">No loyalty programs on file.</p>
						) : (
							<div className="overflow-hidden rounded-lg  w-full rounded-t-none">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Program</TableHead>
											<TableHead>Member number</TableHead>
											<TableHead>Notes</TableHead>
											<TableHead className="w-20 text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{loyaltyPrograms.map((program) => (
											<TableRow key={program.id}>
												<TableCell className="font-medium">
													<CopyableText
														value={program.programName}
														label="program name"
													/>
												</TableCell>
												<TableCell>
													<CopyableText
														value={program.memberNumber}
														label="member number"
													/>
												</TableCell>
												<TableCell className="text-muted-foreground">{program.notes || "—"}</TableCell>
												<TableCell>
													<div className="flex justify-end gap-1">
														<LoyaltyProgramFormDialog
															clientId={clientId}
															program={program}
															trigger={
																<Button
																	variant="ghost"
																	size="icon-sm"
																>
																	<Pencil className="size-4" />
																	<span className="sr-only">Edit {program.programName}</span>
																</Button>
															}
														/>
														<DeleteLoyaltyProgramButton
															loyaltyProgramId={program.id}
															clientId={clientId}
															programName={program.programName}
														/>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card className="pt-0">
				<CardHeader className="bg-sidebar text-sidebar-foreground py-2">
					<CardTitle>Recent activity</CardTitle>
				</CardHeader>
				<CardContent>
					{activity.length === 0 ? (
						<p className="text-sm text-muted-foreground">No activity recorded yet.</p>
					) : (
						<ul className="space-y-3">
							{activity.map((entry) => (
								<li
									key={entry.id}
									className="text-sm"
								>
									<span className="text-muted-foreground">{formatDate(entry.createdAt)} — </span>
									{entry.description || entry.action}
									{entry.user?.name ? <span className="text-muted-foreground"> ({entry.user.name})</span> : null}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
