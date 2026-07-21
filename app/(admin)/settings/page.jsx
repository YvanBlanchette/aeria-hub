import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata = {
  title: "Settings — ÆRIA Hub",
};

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  const isAdmin = user.role === "ADMIN";
  const teamUsers = isAdmin
    ? await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <SettingsTabs user={user} isAdmin={isAdmin} teamUsers={teamUsers} />
    </div>
  );
}
