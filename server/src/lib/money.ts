/**
 * All money math happens here, in integer paise, using integer-only
 * arithmetic — never floating point (PRD §27). Percentages are stored as
 * decimal strings/Decimal from Prisma; we convert to an integer basis-points
 * value first so the whole calculation stays in integers.
 *
 * Rounding rule: round-half-up to the nearest paisa. Documented once, here,
 * so every caller (charity contributions, prize-pool tiers, later draw
 * payouts) is consistent and traceable back to a single rule.
 */
export function percentageOfPaise(amountPaise: number, percentage: number | string): number {
  const basisPoints = Math.round(Number(percentage) * 100); // e.g. 12.5% -> 1250 bps
  const product = amountPaise * basisPoints; // integer * integer, exact
  return Math.round(product / 10_000);
}
