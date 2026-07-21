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
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Client maintenance</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Edit client</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
					Update {client.firstName} {client.lastName}&apos;s profile, service preferences, and operational ownership.
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
