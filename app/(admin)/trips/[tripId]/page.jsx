import { redirect } from "next/navigation";

export default async function TripRootPage({ params }) {
  const { tripId } = await params;
  redirect(`/trips/${tripId}/overview`);
}
