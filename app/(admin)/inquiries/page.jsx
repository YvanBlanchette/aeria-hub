import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { forfaitScope, inquiryScope } from "@/lib/visibility-scope";
import {
	approveClientProfileUpdate,
	createInquiry,
	updateInquiryStatus,
	convertInquiryToClient,
	convertInquiryToQuoteFromPackage,
	updateInquiryLinkedForfait,
} from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export const metadata = {
	title: "Inquiries - AERIA Hub",
};

const STATUS_VARIANT = {
	NEW: "secondary",
	CONTACTED: "outline",
	QUALIFIED: "default",
	CONVERTED: "default",
	LOST: "destructive",
};

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

function sourceLabel(source) {
	if (source === "client_profile_update") return "Profile update";
	if (source === "client_portal") return "Client portal";
	return source || "-";
}

function isProfileUpdate(inquiry) {
	return inquiry.source === "client_profile_update" && inquiry.convertedClientId && inquiry.status !== "CONVERTED";
}

export default async function InquiriesPage() {
	const user = await requireUser();

	const [inquiries, agents, packages] = await Promise.all([
		prisma.inquiry.findMany({
			where: inquiryScope(user),
			orderBy: [{ createdAt: "desc" }],
			take: 300,
			include: {
				assignedAgent: { select: { id: true, name: true, email: true } },
				linkedForfaitQuote: { select: { id: true, name: true } },
				convertedClient: { select: { id: true, firstName: true, lastName: true } },
				convertedTrip: { select: { id: true, name: true } },
				convertedQuote: { select: { id: true, title: true, tripId: true } },
			},
		}),
		user.role === "ADMIN"
			? prisma.user.findMany({
					where: { role: { in: ["ADMIN", "AGENT"] } },
					orderBy: { name: "asc" },
					select: { id: true, name: true, email: true },
				})
			: Promise.resolve([]),
		prisma.forfaitQuote.findMany({
			where: forfaitScope(user),
			orderBy: { updatedAt: "desc" },
			take: 200,
			select: { id: true, name: true },
		}),
	]);

	return (
		<div className="space-y-6">
			<Card className="p-0">
				<CardHeader>
					<CardTitle>Create inquiry</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<form
						action={createInquiry}
						className="grid grid-cols-1 gap-3 md:grid-cols-8"
					>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								name="name"
								placeholder="Jane Doe"
								required
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="jane@example.com"
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								name="phone"
								placeholder="+1 514 000 0000"
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="source">Source</Label>
							<Input
								id="source"
								name="source"
								placeholder="web_form"
							/>
						</div>
						{user.role === "ADMIN" && (
							<div className="space-y-1 md:col-span-2">
								<Label htmlFor="assignedAgentId">Assigned to</Label>
								<select
									id="assignedAgentId"
									name="assignedAgentId"
									className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
								>
									<option value="">Unassigned</option>
									{agents.map((agent) => (
										<option
											key={agent.id}
											value={agent.id}
										>
											{agent.name || agent.email}
										</option>
									))}
								</select>
							</div>
						)}
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="notes">Notes</Label>
							<Input
								id="notes"
								name="notes"
								placeholder="Family of 4, Caribbean cruise, spring break"
							/>
						</div>
						<div className="space-y-1 md:col-span-2">
							<Label htmlFor="linkedForfaitQuoteId">Linked package</Label>
							<select
								id="linkedForfaitQuoteId"
								name="linkedForfaitQuoteId"
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="">None</option>
								{packages.map((item) => (
									<option
										key={item.id}
										value={item.id}
									>
										{item.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex items-end md:col-span-2">
							<Button
								type="submit"
								className="w-full"
							>
								Add inquiry
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card className="p-0">
				<CardHeader>
					<CardTitle>Inquiry pipeline</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{inquiries.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">No inquiries yet.</p>
					) : (
						<div className="overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Contact</TableHead>
										<TableHead>Source</TableHead>
										<TableHead>Owner</TableHead>
										<TableHead>Package</TableHead>
										<TableHead>Converted To</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Created</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{inquiries.map((inquiry) => (
										<TableRow key={inquiry.id}>
											<TableCell className="font-medium">{inquiry.name}</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{inquiry.email || "-"}
												{inquiry.phone ? ` · ${inquiry.phone}` : ""}
											</TableCell>
											<TableCell>{sourceLabel(inquiry.source)}</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{inquiry.assignedAgent?.name || inquiry.assignedAgent?.email || "Unassigned"}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{inquiry.linkedForfaitQuote ? (
													<Link
														href={`/packages?projectId=${inquiry.linkedForfaitQuote.id}`}
														className="font-medium text-foreground hover:underline"
													>
														{inquiry.linkedForfaitQuote.name}
													</Link>
												) : (
													"-"
												)}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{inquiry.convertedQuote?.tripId ? (
													<Link
														href={`/trips/${inquiry.convertedQuote.tripId}/quotes`}
														className="font-medium text-foreground hover:underline"
													>
														{inquiry.convertedQuote.title}
													</Link>
												) : inquiry.convertedTrip ? (
													<Link
														href={`/trips/${inquiry.convertedTrip.id}/overview`}
														className="font-medium text-foreground hover:underline"
													>
														{inquiry.convertedTrip.name}
													</Link>
												) : inquiry.convertedClient ? (
													<Link
														href={`/clients/${inquiry.convertedClient.id}`}
														className="font-medium text-foreground hover:underline"
													>
														{inquiry.convertedClient.firstName} {inquiry.convertedClient.lastName}
													</Link>
												) : (
													"-"
												)}
											</TableCell>
											<TableCell>
												<Badge variant={STATUS_VARIANT[inquiry.status] || "secondary"}>{inquiry.status}</Badge>
											</TableCell>
											<TableCell>{formatDate(inquiry.createdAt)}</TableCell>
											<TableCell>
												<div className="flex flex-wrap items-center justify-end gap-2">
													{isProfileUpdate(inquiry) && (
														<form action={approveClientProfileUpdate}>
															<input
																type="hidden"
																name="inquiryId"
																value={inquiry.id}
															/>
															<Button
																type="submit"
																size="sm"
															>
																Approve
															</Button>
														</form>
													)}
													<form action={updateInquiryLinkedForfait}>
														<input
															type="hidden"
															name="inquiryId"
															value={inquiry.id}
														/>
														<select
															name="linkedForfaitQuoteId"
															defaultValue={inquiry.linkedForfaitQuoteId || ""}
															className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
														>
															<option value="">No package</option>
															{packages.map((item) => (
																<option
																	key={item.id}
																	value={item.id}
																>
																	{item.name}
																</option>
															))}
														</select>
														<Button
															type="submit"
															variant="outline"
															size="sm"
															className="ml-2"
														>
															Link package
														</Button>
													</form>
													<form action={updateInquiryStatus}>
														<input
															type="hidden"
															name="inquiryId"
															value={inquiry.id}
														/>
														<select
															name="status"
															defaultValue={inquiry.status}
															className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
														>
															{STATUS_OPTIONS.map((status) => (
																<option
																	key={status}
																	value={status}
																>
																	{status}
																</option>
															))}
														</select>
														<Button
															type="submit"
															variant="outline"
															size="sm"
															className="ml-2"
														>
															Update
														</Button>
													</form>
													{!inquiry.convertedQuoteId && !inquiry.convertedTripId && !inquiry.convertedClientId && inquiry.status !== "CONVERTED" && (
														<form action={convertInquiryToQuoteFromPackage}>
															<input
																type="hidden"
																name="inquiryId"
																value={inquiry.id}
															/>
															<Button
																type="submit"
																variant="outline"
																size="sm"
																disabled={!inquiry.linkedForfaitQuoteId}
															>
																Convert + Quote
															</Button>
														</form>
													)}
													{!inquiry.convertedQuoteId && !inquiry.convertedTripId && !inquiry.convertedClientId && inquiry.status !== "CONVERTED" && (
														<form action={convertInquiryToClient}>
															<input
																type="hidden"
																name="inquiryId"
																value={inquiry.id}
															/>
															<Button
																type="submit"
																size="sm"
															>
																Convert
															</Button>
														</form>
													)}
													{(inquiry.convertedQuoteId || inquiry.convertedTripId || inquiry.convertedClientId) && (
														<Button
															asChild
															size="sm"
														>
															<Link
																href={
																	inquiry.convertedQuote?.tripId
																		? `/trips/${inquiry.convertedQuote.tripId}/quotes`
																		: inquiry.convertedTripId
																			? `/trips/${inquiry.convertedTripId}/overview`
																			: `/clients/${inquiry.convertedClientId}`
																}
															>
																Open
															</Link>
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
