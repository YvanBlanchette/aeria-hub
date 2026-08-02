import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = {
  title: "New influencer — ÆRIA Inspire",
};

async function createInfluencer(formData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const slug = formData.get("slug")?.toString().trim();
  const commissionRate = Number(formData.get("commissionRate") || 0);
  const notes = formData.get("notes")?.toString().trim();
  const status = formData.get("status")?.toString().trim() || "ACTIVE";

  if (!name) {
    throw new Error("Name is required");
  }

  await prisma.influencer.create({
    data: {
      name,
      email: email || null,
      slug: slug || null,
      commissionRate: Number.isFinite(commissionRate) ? commissionRate : 0,
      status: status,
      notes: notes || null,
    },
  });

  revalidatePath("/inspire/influencers");
  redirect("/inspire/influencers");
}

export default async function NewInfluencerPage() {
  await requireUser();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add an influencer</h1>
        <p className="text-sm text-muted-foreground">Create the profile for a creator who will use the Inspire dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Influencer profile</CardTitle>
          <CardDescription>Start simple; the commission rate can be adjusted later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInfluencer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission rate (%)</Label>
                <Input id="commissionRate" name="commissionRate" type="number" min="0" max="100" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create influencer</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
