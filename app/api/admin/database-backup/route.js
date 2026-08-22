import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET() {
	try {
		await requireAdmin();
		if (!process.env.DATABASE_URL) {
			return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 500 });
		}

		const { stdout } = await execFileAsync("pg_dump", ["--no-owner", "--no-privileges", "--format=custom", process.env.DATABASE_URL], {
			maxBuffer: 1024 * 1024 * 512,
			encoding: "buffer",
		});
		const date = new Date().toISOString().slice(0, 10);

		return new NextResponse(stdout, {
			status: 200,
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="aeria-hub-backup-${date}.dump"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		const message = error?.code === "ENOENT" ? "pg_dump is not installed on the server." : "Database backup failed.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
