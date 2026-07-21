import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { SEGMENT_TYPE_MAP } from "@/lib/trip-segments";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Commissions — ÆRIA Hub",
};

export default async function CommissionsPage() {
  const segments = await prisma.tripSegment.findMany({
    where: { commissions: { some: {} } },
    select: {
      id: true,
      type: true,
      provider: true,
      trip: {
        select: {
          id: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true } },
        },
      },
      commissions: { select: { amount: true, dueDate: true, status: true } },
    },
  });

  const now = new Date();
  let totalPending = 0;
  let totalReceived = 0;
  let overdueCount = 0;

  const rows = segments.map((s) => {
    const totalAmount = s.commissions.reduce((sum, c) => sum + c.amount, 0);
    const dueDates = s.commissions
      .map((c) => c.dueDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b));
    const paymentDate = dueDates[0] ?? null;

    const allReceived = s.commissions.every((c) => c.status === "RECEIVED");
    const anyReceived = s.commissions.some((c) => c.status === "RECEIVED");
    const status = allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : "PENDING";

    for (const c of s.commissions) {
      if (c.status === "RECEIVED") totalReceived += c.amount;
      else {
        totalPending += c.amount;
        if (c.dueDate && new Date(c.dueDate) < now) overdueCount++;
      }
    }

    return {
      segmentId: s.id,
      tripId: s.trip.id,
      provider: s.provider,
      typeLabel: SEGMENT_TYPE_MAP[s.type]?.label || s.type,
      clientName: `${s.trip.client.firstName} ${s.trip.client.lastName}`,
      totalAmount,
      paymentDate,
      bookingDate: s.trip.createdAt,
      status,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground">One row per segment with a commission — click a row for the full detail.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={formatCurrency(totalPending)} icon={Clock} />
        <StatCard label="Received" value={formatCurrency(totalReceived)} icon={CheckCircle2} />
        <StatCard label="Overdue portions" value={overdueCount} icon={AlertTriangle} />
      </div>

      <CommissionsTable rows={rows} />
    </div>
  );
}
