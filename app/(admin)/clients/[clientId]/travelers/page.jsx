import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TravelerFormDialog } from "@/components/clients/traveler-form-dialog";
import { DeleteTravelerButton } from "@/components/clients/delete-traveler-button";
import { formatDate } from "@/lib/format";

export default async function TravelersPage({ params }) {
  const { clientId } = await params;

  const travelers = await prisma.traveler.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Travelers</h2>
        <TravelerFormDialog
          clientId={clientId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Add traveler
            </Button>
          }
        />
      </div>

      {travelers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No travelers added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {travelers.map((traveler) => (
            <Card key={traveler.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {traveler.firstName} {traveler.lastName}
                    </p>
                    {traveler.relationshipToClient && (
                      <Badge variant="secondary" className="mt-1">
                        {traveler.relationshipToClient}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <TravelerFormDialog
                      clientId={clientId}
                      traveler={traveler}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit {traveler.firstName}</span>
                        </Button>
                      }
                    />
                    <DeleteTravelerButton
                      travelerId={traveler.id}
                      clientId={clientId}
                      travelerName={`${traveler.firstName} ${traveler.lastName}`}
                    />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="inline font-medium">DOB: </dt>
                    <dd className="inline">{traveler.dateOfBirth ? formatDate(traveler.dateOfBirth) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Nationality: </dt>
                    <dd className="inline">{traveler.nationality || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Passport: </dt>
                    <dd className="inline">{traveler.passportNumber || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Expires: </dt>
                    <dd className="inline">{traveler.passportExpiry ? formatDate(traveler.passportExpiry) : "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
