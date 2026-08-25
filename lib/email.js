const DEFAULT_RESEND_FROM = "AERIA Voyages <onboarding@resend.dev>";
const DEFAULT_BREVO_FROM_EMAIL = "hello@example.com";
const DEFAULT_BREVO_FROM_NAME = "AERIA Voyages";

function escapeHtml(value) {
	return String(value || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function isEmailConfigured() {
	return getEmailProvider() === "brevo" ? Boolean(process.env.BREVO_API_KEY) : Boolean(process.env.RESEND_API_KEY);
}

function getEmailProvider() {
	return String(process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
}

function parseFromAddress(value) {
	const from = String(value || "").trim();
	const match = from.match(/^(.*?)\s*<([^>]+)>$/);
	if (match) {
		return { name: match[1].trim().replace(/^"|"$/g, "") || DEFAULT_BREVO_FROM_NAME, email: match[2].trim() };
	}
	return { name: process.env.AERIA_EMAIL_FROM_NAME || DEFAULT_BREVO_FROM_NAME, email: from || process.env.AERIA_EMAIL_FROM_EMAIL || DEFAULT_BREVO_FROM_EMAIL };
}

async function sendWithResend({ to, subject, html, text }) {
	if (!process.env.RESEND_API_KEY) {
		return { ok: false, error: "Email delivery is not configured. Add RESEND_API_KEY to enable Resend." };
	}

	let response;
	try {
		response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: process.env.AERIA_EMAIL_FROM || DEFAULT_RESEND_FROM,
				to,
				subject,
				html,
				text,
			}),
		});
	} catch (error) {
		return { ok: false, error: `Unable to reach Resend: ${error?.message || "network request failed"}` };
	}

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		return { ok: false, error: body || "Email provider rejected the message." };
	}

	return { ok: true };
}

async function sendWithBrevo({ to, subject, html, text }) {
	if (!process.env.BREVO_API_KEY) {
		return { ok: false, error: "Email delivery is not configured. Add BREVO_API_KEY to enable Brevo." };
	}

	const sender = parseFromAddress(process.env.AERIA_EMAIL_FROM);
	let response;
	try {
		response = await fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"api-key": process.env.BREVO_API_KEY,
			},
			body: JSON.stringify({
				sender,
				to: [{ email: to }],
				subject,
				htmlContent: html,
				textContent: text,
			}),
		});
	} catch (error) {
		return { ok: false, error: `Unable to reach Brevo: ${error?.message || "network request failed"}` };
	}

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		return { ok: false, error: body || "Email provider rejected the message." };
	}

	return { ok: true };
}

export async function sendEmail(message) {
	return getEmailProvider() === "brevo" ? sendWithBrevo(message) : sendWithResend(message);
}

export function renderTravelProfileEmail({ firstName, primaryProfile, secondaryProfile }) {
	const recommendations = primaryProfile.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
	const keywords = primaryProfile.keywords.map((item) => `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;border-radius:999px;background:#f4f0e8;color:#12202b;font-size:13px;">${escapeHtml(item)}</span>`).join("");
	const greeting = firstName ? `Bonjour ${escapeHtml(firstName)},` : "Bonjour,";

	const html = `
		<div style="margin:0;padding:0;background:#f7f5f1;font-family:Segoe UI,Arial,sans-serif;color:#12202b;">
			<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
				<div style="background:#ffffff;border:1px solid #ddd7ce;border-radius:16px;overflow:hidden;">
					<div style="background:#0e4f6a;color:#ffffff;padding:22px 24px;">
						<div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.78;">Profils AERIA</div>
						<h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">Votre profil voyage: ${escapeHtml(primaryProfile.name)}</h1>
					</div>
					<div style="padding:24px;">
						<p style="font-size:16px;line-height:1.65;margin:0 0 18px;">${greeting}</p>
						<p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Votre profil dominant est <strong>${escapeHtml(primaryProfile.name)}</strong>. ${escapeHtml(primaryProfile.tagline)}</p>
						<p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Votre profil secondaire est <strong>${escapeHtml(secondaryProfile.name)}</strong>, ce qui nuance vos préférences et aide votre conseiller à proposer des expériences plus personnalisées.</p>
						<div style="margin:20px 0 12px;">${keywords}</div>
						<h2 style="font-size:18px;margin:24px 0 10px;">Voyages à explorer</h2>
						<ul style="padding-left:20px;margin:0 0 20px;font-size:15px;line-height:1.7;">${recommendations}</ul>
						<p style="font-size:14px;line-height:1.65;color:#6b7280;margin:24px 0 0;">Un conseiller AERIA peut utiliser ce résultat comme point de départ pour affiner vos prochaines recommandations.</p>
					</div>
				</div>
			</div>
		</div>
	`;

	const text = [
		greeting,
		"",
		`Votre profil voyage AERIA: ${primaryProfile.name}`,
		primaryProfile.tagline,
		"",
		`Profil secondaire: ${secondaryProfile.name}`,
		secondaryProfile.tagline,
		"",
		"Voyages à explorer:",
		...primaryProfile.recommendations.map((item) => `- ${item}`),
	].join("\n");

	return { html, text };
}
