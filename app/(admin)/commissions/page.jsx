import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { CommissionsTable } from "@/components/commissions/commissions-table";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Commissions — ÆRIA Hub",
};

export default async function CommissionsPage() {
  const segments = await prisma.tripSegment.findMany({
    where: { commissions: { some: {} } },
    select: {
      trip: {
        select: {
          id: true,
          name: true,
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

  const tripMap = new Map();
  for (const s of segments) {
    const tripId = s.trip.id;
    if (!tripMap.has(tripId)) {
      tripMap.set(tripId, {
        tripId,
        tripName: s.trip.name,
        clientName: `${s.trip.client.firstName} ${s.trip.client.lastName}`,
        bookingDate: s.trip.createdAt,
        totalAmount: 0,
        dueDates: [],
        allReceived: true,
        anyReceived: false,
      });
    }
    const entry = tripMap.get(tripId);
    for (const c of s.commissions) {
      entry.totalAmount += c.amount;
      if (c.dueDate) entry.dueDates.push(c.dueDate);
      if (c.status === "RECEIVED") {
        entry.anyReceived = true;
        totalReceived += c.amount;
      } else {
        entry.allReceived = false;
        totalPending += c.amount;
        if (c.dueDate && new Date(c.dueDate) < now) overdueCount++;
      }
    }
  }

  const rows = [...tripMap.values()].map((entry) => {
    const sortedDates = entry.dueDates.slice().sort((a, b) => new Date(a) - new Date(b));
    const status = entry.allReceived ? "RECEIVED" : entry.anyReceived ? "PARTIAL" : "PENDING";
    return {
      tripId: entry.tripId,
      tripName: entry.tripName,
      clientName: entry.clientName,
      totalAmount: entry.totalAmount,
      paymentDate: sortedDates[0] ?? null,
      bookingDate: entry.bookingDate,
      status,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground">One row per trip — click a row for the full segment-by-segment detail.</p>
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
