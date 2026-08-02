import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Influencers — ÆRIA Inspire",
};

export default async function InspireInfluencersPage() {
  await requireUser();

  const influencers = await prisma.influencer.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Influencers</h1>
          <p className="text-sm text-muted-foreground">Manage the creators who can share offers and generate sales.</p>
        </div>
        <Button asChild>
          <Link href="/inspire/influencers/new">
            <Plus className="mr-2 size-4" />
            New influencer
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {influencers.map((influencer) => (
          <Card key={influencer.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{influencer.name}</CardTitle>
                <CardDescription>{influencer.email || "No email yet"}</CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Commission: {influencer.commissionRate}%</div>
                <div>Status: {influencer.status}</div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {influencer.notes || "No notes yet."}
            </CardContent>
          </Card>
        ))}
        {influencers.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No influencers yet. Add the first creator to start the program.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
