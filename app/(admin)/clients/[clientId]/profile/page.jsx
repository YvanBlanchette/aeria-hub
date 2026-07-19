import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientProfilePage({ params }) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();

  const activity = await prisma.activityLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact & address</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
            <Field label="Address" value={client.address} />
            <Field label="City" value={client.city} />
            <Field label="Country" value={client.country} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travel details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date of birth" value={client.dateOfBirth ? formatDate(client.dateOfBirth) : null} />
            <Field label="Nationality" value={client.nationality} />
            <Field label="Passport number" value={client.passportNumber} />
            <Field label="Passport expiry" value={client.passportExpiry ? formatDate(client.passportExpiry) : null} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences & notes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Travel preferences" value={client.travelPreferences} />
            <Field label="Loyalty programs" value={client.loyaltyPrograms} />
            <Field label="Dietary notes" value={client.dietaryNotes} />
            <Field label="Mobility notes" value={client.mobilityNotes} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="text-muted-foreground">{formatDate(entry.createdAt)} — </span>
                  {entry.description || entry.action}
                  {entry.user?.name ? (
                    <span className="text-muted-foreground"> ({entry.user.name})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
