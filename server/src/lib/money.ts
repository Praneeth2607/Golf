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

/**
 * Splits a paise amount into `parts` equal shares that sum back to exactly
 * the original amount (PRD §07: "prizes split equally among multiple
 * winners"). Integer division drops a remainder of at most `parts - 1`
 * paise; that remainder is handed out one paisa at a time to the first few
 * shares rather than silently lost, so total payouts always reconcile.
 */
export function splitEqually(totalPaise: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(totalPaise / parts);
  const remainder = totalPaise - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}
