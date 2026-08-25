"use server";

import { PROFILES, QUESTIONS, getTravelProfileResult } from "@/lib/aeria-travel-profiles";
import { renderTravelProfileEmail, sendEmail } from "@/lib/email";

function readRequiredString(formData, key) {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readAnswers(formData) {
	const raw = formData.get("answers");
	if (typeof raw !== "string") return null;
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return null;
		if (parsed.length !== QUESTIONS.length) return null;
		return parsed.every((answerId, index) => QUESTIONS[index].options.some((option) => option.id === answerId)) ? parsed : null;
	} catch {
		return null;
	}
}

export async function sendTravelProfileResult(prevState, formData) {
	const firstName = readRequiredString(formData, "firstName");
	const lastName = readRequiredString(formData, "lastName");
	const email = readRequiredString(formData, "email").toLowerCase();
	const answers = readAnswers(formData);

	if (!firstName || !lastName || !email) {
		return { ok: false, message: "Veuillez entrer votre prénom, nom et courriel." };
	}

	if (!isValidEmail(email)) {
		return { ok: false, message: "Veuillez entrer une adresse courriel valide." };
	}

	if (!answers) {
		return { ok: false, message: "Veuillez compléter le quiz avant d'envoyer votre résultat." };
	}

	const result = getTravelProfileResult(answers);
	const primaryProfile = PROFILES[result.primary.key];
	const secondaryProfile = PROFILES[result.secondary.key];
	const { html, text } = renderTravelProfileEmail({ firstName, lastName, primaryProfile, secondaryProfile });

	const emailResult = await sendEmail({
		to: email,
		subject: `Votre profil voyage AERIA: ${primaryProfile.name}`,
		html,
		text,
	});

	if (!emailResult.ok) {
		console.error("Travel profile email failed:", emailResult.error);
		return { ok: false, message: "Le courriel n'a pas pu être envoyé. La configuration d'envoi doit être complétée." };
	}

	return { ok: true, message: "Votre résultat personnalisé a été envoyé par courriel." };
}
