import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/client-form";
import { updateClient } from "../../actions";

export const metadata = {
	title: "Edit Client — ÆRIA Hub",
};

export default async function EditClientPage({ params }) {
	const { clientId } = await params;

	const [client, agents] = await Promise.all([
		prisma.client.findUnique({ where: { id: clientId } }),
		prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
	]);

	if (!client) notFound();

	const boundUpdateClient = updateClient.bind(null, clientId);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
				<p className="text-sm text-muted-foreground">
					Update {client.firstName} {client.lastName}&apos;s profile.
				</p>
			</div>
			<ClientForm
				action={boundUpdateClient}
				client={client}
				agents={agents}
				submitLabel="Save changes"
			/>
		</div>
	);
}
