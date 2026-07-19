import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientTabNav } from "@/components/clients/client-tab-nav";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { initials } from "@/lib/format";

export default async function ClientLayout({ children, params }) {
	const { clientId } = await params;

	const client = await prisma.client.findUnique({
		where: { id: clientId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			primaryEmail: true,
			primaryPhone: true,
			status: true,
		},
	});

	if (!client) notFound();

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<Avatar className="size-12">
						<AvatarFallback className="bg-primary text-base text-primary-foreground">{initials(`${client.firstName} ${client.lastName}`)}</AvatarFallback>
					</Avatar>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-semibold tracking-tight">
								{client.firstName} {client.lastName}
							</h1>
							<Badge variant={client.status === "active" ? "default" : "secondary"}>{client.status}</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{client.primaryEmail || "No email"} {client.primaryPhone ? `· ${client.primaryPhone}` : ""}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						asChild
					>
						<Link href={`/clients/${client.id}/edit`}>
							<Pencil className="size-4" />
							Edit
						</Link>
					</Button>
					<DeleteClientButton
						clientId={client.id}
						clientName={`${client.firstName} ${client.lastName}`}
						variant="outline"
						size="icon"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-6 md:flex-row">
				<ClientTabNav clientId={client.id} />
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
