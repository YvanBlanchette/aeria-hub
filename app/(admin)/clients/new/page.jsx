import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/client-form";
import { createClient } from "../actions";

export const metadata = {
	title: "New Client — ÆRIA Hub",
};

export default async function NewClientPage() {
	const agents = await prisma.user.findMany({
		orderBy: { name: "asc" },
		select: { id: true, name: true },
	});

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Create profile</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">New client</h1>
				<p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
					Create a client record with the contact details, traveler context, and internal ownership your team needs.
				</p>
			</div>
			<ClientForm
				action={createClient}
				agents={agents}
				submitLabel="Create client"
			/>
		</div>
	);
}
