import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleOAuthUrl } from "@/lib/google-calendar";

function appOrigin(request) {
	return process.env.NEXTAUTH_URL || new URL(request.url).origin;
}

export async function GET(request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const state = crypto.randomUUID();
	const origin = appOrigin(request);
	const redirectUrl = buildGoogleOAuthUrl(origin, state);

	const response = NextResponse.redirect(redirectUrl);
	response.cookies.set("aeria_google_oauth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 60 * 10,
		path: "/",
	});

	return response;
}
