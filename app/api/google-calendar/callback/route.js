import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCodeForTokens, upsertGoogleConnection } from "@/lib/google-calendar";

function appOrigin(request) {
	return process.env.NEXTAUTH_URL || new URL(request.url).origin;
}

export async function GET(request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const cookieState = request.cookies.get("aeria_google_oauth_state")?.value;

	if (!code || !state || !cookieState || state !== cookieState) {
		return NextResponse.redirect(new URL("/calendar?google=state_error", request.url));
	}

	try {
		const origin = appOrigin(request);
		const tokenPayload = await exchangeCodeForTokens(code, origin);
		await upsertGoogleConnection(session.user.id, tokenPayload);

		const response = NextResponse.redirect(new URL("/calendar?google=connected", request.url));
		response.cookies.set("aeria_google_oauth_state", "", { maxAge: 0, path: "/" });
		return response;
	} catch {
		return NextResponse.redirect(new URL("/calendar?google=connect_error", request.url));
	}
}
