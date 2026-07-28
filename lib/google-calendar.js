import "server-only";
import { prisma } from "@/lib/prisma";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

export function buildGoogleRedirectUri(origin) {
	return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google-calendar/callback`;
}

export function buildGoogleOAuthUrl(origin, state) {
	const clientId = requiredEnv("GOOGLE_CLIENT_ID");
	const redirectUri = buildGoogleRedirectUri(origin);

	const url = new URL(GOOGLE_AUTH_URL);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("prompt", "consent");
	url.searchParams.set("include_granted_scopes", "true");
	url.searchParams.set("state", state);
	return url.toString();
}

export async function exchangeCodeForTokens(code, origin) {
	const clientId = requiredEnv("GOOGLE_CLIENT_ID");
	const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
	const redirectUri = buildGoogleRedirectUri(origin);

	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		grant_type: "authorization_code",
	});

	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
		cache: "no-store",
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token exchange failed: ${text}`);
	}

	return res.json();
}

export async function fetchGoogleUserEmail(accessToken) {
	const res = await fetch(GOOGLE_USERINFO_URL, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (!res.ok) return null;
	const payload = await res.json();
	return payload?.email || null;
}

export async function upsertGoogleConnection(userId, tokenPayload) {
	const email = await fetchGoogleUserEmail(tokenPayload.access_token);
	const expiryDate = tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000) : null;

	const existing = await prisma.googleCalendarConnection.findUnique({ where: { userId } });

	return prisma.googleCalendarConnection.upsert({
		where: { userId },
		create: {
			userId,
			googleEmail: email,
			scope: tokenPayload.scope || null,
			accessToken: tokenPayload.access_token,
			refreshToken: tokenPayload.refresh_token || "",
			expiryDate,
		},
		update: {
			googleEmail: email,
			scope: tokenPayload.scope || existing?.scope || null,
			accessToken: tokenPayload.access_token,
			refreshToken: tokenPayload.refresh_token || existing?.refreshToken || "",
			expiryDate,
			lastSyncError: null,
		},
	});
}

async function refreshAccessTokenIfNeeded(connection) {
	const stillValid = connection.expiryDate && connection.expiryDate.getTime() > Date.now() + 60 * 1000;
	if (stillValid) return connection.accessToken;

	if (!connection.refreshToken) {
		throw new Error("No refresh token stored for Google Calendar connection.");
	}

	const clientId = requiredEnv("GOOGLE_CLIENT_ID");
	const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");

	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: connection.refreshToken,
		grant_type: "refresh_token",
	});

	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
		cache: "no-store",
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Google token refresh failed: ${text}`);
	}

	const payload = await res.json();
	const expiryDate = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null;

	await prisma.googleCalendarConnection.update({
		where: { id: connection.id },
		data: {
			accessToken: payload.access_token,
			expiryDate,
		},
	});

	return payload.access_token;
}

function eventGoogleId(id) {
	return `aeria_${id.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}`;
}

function toGoogleEvent(event, timezone) {
	const start = new Date(event.startDate);
	const end = new Date(event.endDate || event.startDate);
	const allDayEnd = new Date(end);
	allDayEnd.setDate(allDayEnd.getDate() + 1);

	return {
		id: eventGoogleId(event.id),
		summary: event.title,
		description: event.description || "",
		extendedProperties: {
			private: {
				aeriaEventId: event.id,
				aeriaEventType: event.type,
			},
		},
		...(event.allDay
			? {
					start: { date: start.toISOString().slice(0, 10) },
					end: { date: allDayEnd.toISOString().slice(0, 10) },
				}
			: {
					start: { dateTime: start.toISOString(), timeZone: timezone },
					end: { dateTime: end.toISOString(), timeZone: timezone },
				}),
	};
}

async function upsertGoogleEvent(accessToken, eventPayload) {
	const eventId = eventPayload.id;
	const base = `${GOOGLE_CALENDAR_API}/calendars/primary/events`;

	const existing = await fetch(`${base}/${eventId}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});

	if (existing.ok) {
		const update = await fetch(`${base}/${eventId}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(eventPayload),
			cache: "no-store",
		});
		if (!update.ok) {
			throw new Error(`Failed to update Google event ${eventId}`);
		}
		return;
	}

	const create = await fetch(base, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(eventPayload),
		cache: "no-store",
	});

	if (!create.ok) {
		const text = await create.text();
		throw new Error(`Failed to create Google event ${eventId}: ${text}`);
	}
}

export async function syncEventsToGoogleCalendar(userId, events) {
	const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
	if (!connection) {
		throw new Error("Google Calendar is not connected for this account.");
	}

	const timezone = process.env.CRM_CALENDAR_TIMEZONE || "America/Toronto";

	try {
		const accessToken = await refreshAccessTokenIfNeeded(connection);

		for (const event of events) {
			const payload = toGoogleEvent(event, timezone);
			await upsertGoogleEvent(accessToken, payload);
		}

		await prisma.googleCalendarConnection.update({
			where: { id: connection.id },
			data: { lastSyncAt: new Date(), lastSyncError: null },
		});

		return { synced: events.length };
	} catch (error) {
		await prisma.googleCalendarConnection.update({
			where: { id: connection.id },
			data: { lastSyncError: String(error?.message || error) },
		});
		throw error;
	}
}
