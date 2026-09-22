export type MatchTierResult = "FIVE" | "FOUR" | "THREE" | null;

/**
 * A ticket with fewer than 5 numbers (a subscriber who hasn't logged a full
 * 5 scores yet) can only ever reach as high a tier as it has numbers for —
 * it is not padded or filled in. Documented consequence of "your scores are
 * your ticket": partial participation gives partial odds, never a boosted
 * or invalid one.
 */
export function calculateMatches(ticketNumbers: number[], winningNumbers: number[]): MatchTierResult {
  const winningSet = new Set(winningNumbers);
  const matchCount = new Set(ticketNumbers).size
    ? [...new Set(ticketNumbers)].filter((n) => winningSet.has(n)).length
    : 0;

  if (matchCount >= 5) return "FIVE";
  if (matchCount === 4) return "FOUR";
  if (matchCount === 3) return "THREE";
  return null;
}
