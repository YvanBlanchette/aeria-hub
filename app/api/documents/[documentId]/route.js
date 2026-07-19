import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

export async function GET(request, { params }) {
  await requireUser();

  const { documentId } = await params;
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    return new NextResponse("Not found", { status: 404 });
  }

  let bytes;
  try {
    bytes = await readFile(path.join(UPLOAD_ROOT, document.storagePath));
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
