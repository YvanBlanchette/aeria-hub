import "server-only";

function isAdmin(user) {
	return !user || user.role === "ADMIN";
}

export function clientScope(user) {
	if (isAdmin(user)) return undefined;
	return { assignedAgentId: user.id };
}

export function tripScope(user) {
	if (isAdmin(user)) return undefined;
	return { client: { assignedAgentId: user.id } };
}

export function quoteScope(user) {
	if (isAdmin(user)) return undefined;
	return { trip: { client: { assignedAgentId: user.id } } };
}

export function invoiceScope(user) {
	if (isAdmin(user)) return undefined;
	return { client: { assignedAgentId: user.id } };
}

export function taskScope(user) {
	if (isAdmin(user)) return undefined;
	return { trip: { client: { assignedAgentId: user.id } } };
}

export function reminderScope(user) {
	if (isAdmin(user)) return undefined;
	return { client: { assignedAgentId: user.id } };
}

export function activityScope(user) {
	if (isAdmin(user)) return undefined;
	return {
		OR: [{ userId: user.id }, { client: { assignedAgentId: user.id } }],
	};
}

export function inquiryScope(user) {
	if (isAdmin(user)) return undefined;
	return { assignedAgentId: user.id };
}
