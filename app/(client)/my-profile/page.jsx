import { requireUser } from "@/lib/session";
import { getClientPortalRecord } from "@/lib/client-portal";
import { ClientTravelProfilePage } from "@/components/clients/client-travel-profile-page";

export const metadata = {
	title: "My Travel Profile — ÆRIA Hub",
};

export default async function MyProfilePage() {
	const user = await requireUser();
	const portal = await getClientPortalRecord(user);

	if (!portal) {
		return <div className="p-6 text-muted-foreground">No client profile found for this account.</div>;
	}

	return <ClientTravelProfilePage client={portal.client} />;
}
