"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { TeamTable } from "@/components/settings/team-table";
import { InviteAgentDialog } from "@/components/settings/invite-agent-dialog";

export function SettingsTabs({ user, isAdmin, teamUsers }) {
  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile" className="space-y-6 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarUpload name={user.name} avatarUrl={user.avatarUrl} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile info</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <AppearanceForm />
          </CardContent>
        </Card>
      </TabsContent>

      {isAdmin && (
        <TabsContent value="team" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Team</CardTitle>
              <InviteAgentDialog />
            </CardHeader>
            <CardContent>
              <TeamTable users={teamUsers} currentUserId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
