export function getInspireCommissionTier({ totalRevenueCents = 0, baseRate = 0 }) {
	const tiers = [
		{ name: "Starter", thresholdCents: 0, boostPercent: 0 },
		{ name: "Rising Star", thresholdCents: 500000, boostPercent: 2 },
		{ name: "Elite Creator", thresholdCents: 1500000, boostPercent: 5 },
	];

	let activeTier = tiers[0];
	let nextTier = null;
	let nextThresholdCents = null;
	let progressPercent = 100;

	for (let index = 0; index < tiers.length; index += 1) {
		const tier = tiers[index];

		if (totalRevenueCents >= tier.thresholdCents) {
			activeTier = tier;

			if (index < tiers.length - 1) {
				nextTier = tiers[index + 1];
				nextThresholdCents = nextTier.thresholdCents;
				const reachedSinceCurrentTier = Math.max(totalRevenueCents - tier.thresholdCents, 0);
				const neededForNextTier = Math.max(nextTier.thresholdCents - tier.thresholdCents, 1);
				progressPercent = Math.min(100, Math.round((reachedSinceCurrentTier / neededForNextTier) * 100));
			}
		} else {
			nextTier = tier;
			nextThresholdCents = tier.thresholdCents;
			progressPercent = Math.min(100, Math.round((totalRevenueCents / tier.thresholdCents) * 100));
			break;
		}
	}

	return {
		currentTier: activeTier.name,
		effectiveRate: Number((baseRate + activeTier.boostPercent).toFixed(1)),
		nextTier: nextTier?.name ?? null,
		nextThresholdCents,
		progressPercent,
	};
}
