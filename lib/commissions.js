const EXOTICCA_SPLIT = { first: 0.6, second: 0.4 };

/** True when a segment follows Exoticca's split commission schedule (60% at booking, 40% at client return). */
export function isExoticcaCircuit(segment) {
  return segment.type === "CIRCUIT" && (segment.supplier?.name || "").toLowerCase().includes("exoticca");
}

/**
 * Computes the commission portions (amount + due date) for a segment's
 * total commission. Exoticca circuits split 60% due at the trip's booking
 * date (creation) and 40% at the client's return (trip end date); every
 * other segment gets a single portion due at the trip's end date.
 * @param {number} totalAmount cents
 * @param {{ type: string, supplier?: { name: string } | null }} segment
 * @param {{ createdAt: Date, endDate?: Date | null }} trip
 */
export function computeCommissionPortions(totalAmount, segment, trip) {
  if (isExoticcaCircuit(segment)) {
    const first = Math.round(totalAmount * EXOTICCA_SPLIT.first);
    const second = totalAmount - first;
    return [
      { amount: first, dueDate: trip.createdAt },
      { amount: second, dueDate: trip.endDate ?? null },
    ];
  }
  return [{ amount: totalAmount, dueDate: trip.endDate ?? null }];
}
