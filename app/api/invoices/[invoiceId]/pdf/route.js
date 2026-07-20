import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(request, { params }) {
  await requireUser();

  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      trip: { select: { name: true, destination: true, startDate: true, endDate: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await renderInvoicePdf(invoice);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
