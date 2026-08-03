import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { inquiryScope } from "@/lib/visibility-scope";
import { createInquiry, updateInquiryStatus, convertInquiryToClient } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

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

export default async function InquiriesPage() {
	const user = await requireUser();

	const [inquiries, agents] = await Promise.all([
		prisma.inquiry.findMany({
			where: inquiryScope(user),
			orderBy: [{ createdAt: "desc" }],
			take: 300,
			include: { assignedAgent: { select: { id: true, name: true, email: true } } },
		}),
		user.role === "ADMIN"
			? prisma.user.findMany({
					where: { role: { in: ["ADMIN", "AGENT"] } },
					orderBy: { name: "asc" },
					select: { id: true, name: true, email: true },
			  })
			: Promise.resolve([]),
	]);

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="space-y-2">
					<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Lead workspace</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Inquiries</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						Capture inbound demand, update pipeline status, and convert qualified leads into client trips.
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Create inquiry</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						action={createInquiry}
						className="grid grid-cols-1 gap-3 md:grid-cols-6"
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
						<div className="space-y-1 md:col-span-3">
							<Label htmlFor="notes">Notes</Label>
							<Input
								id="notes"
								name="notes"
								placeholder="Family of 4, Caribbean cruise, spring break"
							/>
						</div>
						<div className="flex items-end md:col-span-1">
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

			<Card>
				<CardHeader>
					<CardTitle>Inquiry pipeline</CardTitle>
				</CardHeader>
				<CardContent>
					{inquiries.length === 0 ? (
						<p className="text-sm text-muted-foreground">No inquiries yet.</p>
					) : (
						<div className="overflow-hidden rounded-lg border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Contact</TableHead>
										<TableHead>Source</TableHead>
										<TableHead>Owner</TableHead>
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
											<TableCell>{inquiry.source || "-"}</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{inquiry.assignedAgent?.name || inquiry.assignedAgent?.email || "Unassigned"}
											</TableCell>
											<TableCell>
												<Badge variant={STATUS_VARIANT[inquiry.status] || "secondary"}>{inquiry.status}</Badge>
											</TableCell>
											<TableCell>{formatDate(inquiry.createdAt)}</TableCell>
											<TableCell>
												<div className="flex flex-wrap items-center justify-end gap-2">
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
													{inquiry.status !== "CONVERTED" && (
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
