import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import { GOOGLE_HEADERS, OUTLOOK_HEADERS, buildGoogleRow, buildOutlookRow } from "@/lib/contacts-csv";

export async function GET(request) {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "outlook" ? "outlook" : "google";

  const clients = await prisma.client.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });

  const headers = format === "outlook" ? OUTLOOK_HEADERS : GOOGLE_HEADERS;
  const buildRow = format === "outlook" ? buildOutlookRow : buildGoogleRow;
  const csv = toCsv(headers, clients.map(buildRow));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aeria-hub-clients-${format}.csv"`,
    },
  });
}
