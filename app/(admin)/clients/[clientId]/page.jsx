import { redirect } from "next/navigation";

export default async function ClientRootPage({ params }) {
  const { clientId } = await params;
  redirect(`/clients/${clientId}/profile`);
}
