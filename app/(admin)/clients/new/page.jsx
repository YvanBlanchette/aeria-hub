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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
        <p className="text-sm text-muted-foreground">Add a new client to ÆRIA Hub.</p>
      </div>
      <ClientForm action={createClient} agents={agents} submitLabel="Create client" />
    </div>
  );
}
