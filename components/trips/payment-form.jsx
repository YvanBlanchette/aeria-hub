"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentFields } from "@/components/trips/payment-fields";
import { createPayment } from "@/app/(admin)/trips/[tripId]/payments/actions";

export function PaymentForm({ tripId }) {
  const action = createPayment.bind(null, tripId);
  const [error, formAction, pending] = useActionState(action, undefined);
  const wasPending = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <PaymentFields />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
