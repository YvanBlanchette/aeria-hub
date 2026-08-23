const EXOTICCA_SPLIT = { first: 0.6, second: 0.4 };

/** True when a segment follows Exoticca's split commission schedule (60% at booking, 40% at client return). */
export function isExoticcaCircuit(segment) {
	return segment.type === "CIRCUIT" && (segment.supplier?.name || "").toLowerCase().includes("exoticca");
}

/** Adds one calendar month, used because commissions are typically paid out ~1 month after the triggering date. */
function addOneMonth(date) {
	if (!date) return null;
	const result = new Date(date);
	result.setMonth(result.getMonth() + 1);
	return result;
}

/**
 * Computes the commission portions (amount + due date) for a segment's
 * total commission. Due dates are always 1 month after the triggering
 * event, since suppliers pay out commissions on that delay. Exoticca
 * circuits split 60% due 1 month after booking (trip creation) and 40%
 * due 1 month after the client's return (trip end date); every other
 * segment gets a single portion due 1 month after the trip's end date.
 * @param {number} totalAmount cents
 * @param {{ type: string, supplier?: { name: string } | null }} segment
 * @param {{ createdAt: Date, endDate?: Date | null }} trip
 */
export function computeCommissionPortions(totalAmount, segment, trip) {
	if (isExoticcaCircuit(segment)) {
		const first = Math.round(totalAmount * EXOTICCA_SPLIT.first);
		const second = totalAmount - first;
		return [
			{ amount: first, dueDate: addOneMonth(trip.createdAt) },
			{ amount: second, dueDate: addOneMonth(trip.endDate) },
		];
	}
	return [{ amount: totalAmount, dueDate: addOneMonth(trip.endDate) }];
}
