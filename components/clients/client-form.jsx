"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dateInputValue(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * @param {{ action: Function, client?: object, agents: {id:string,name:string}[], submitLabel: string }} props
 */
export function ClientForm({ action, client, agents, submitLabel }) {
  const [errorMessage, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" defaultValue={client?.firstName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" defaultValue={client?.lastName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Street address</Label>
            <Input id="address" name="address" defaultValue={client?.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={client?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={client?.country ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Travel details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={dateInputValue(client?.dateOfBirth)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue={client?.nationality ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passportNumber">Passport number</Label>
            <Input id="passportNumber" name="passportNumber" defaultValue={client?.passportNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passportExpiry">Passport expiry</Label>
            <Input
              id="passportExpiry"
              name="passportExpiry"
              type="date"
              defaultValue={dateInputValue(client?.passportExpiry)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences & notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="travelPreferences">Travel preferences</Label>
            <Textarea
              id="travelPreferences"
              name="travelPreferences"
              rows={3}
              placeholder="Window seat, boutique hotels, direct flights..."
              defaultValue={client?.travelPreferences ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loyaltyPrograms">Loyalty programs</Label>
            <Textarea
              id="loyaltyPrograms"
              name="loyaltyPrograms"
              rows={3}
              placeholder="Delta SkyMiles #12345, Marriott Bonvoy #67890..."
              defaultValue={client?.loyaltyPrograms ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dietaryNotes">Dietary notes</Label>
            <Textarea
              id="dietaryNotes"
              name="dietaryNotes"
              rows={2}
              defaultValue={client?.dietaryNotes ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobilityNotes">Mobility notes</Label>
            <Textarea
              id="mobilityNotes"
              name="mobilityNotes"
              rows={2}
              defaultValue={client?.mobilityNotes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status & assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={client?.status ?? "active"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedAgentId">Assigned agent</Label>
            <Select name="assignedAgentId" defaultValue={client?.assignedAgentId ?? ""}>
              <SelectTrigger id="assignedAgentId" className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
