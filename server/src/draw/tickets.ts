/**
 * A subscriber's draw ticket is simply their own logged Stableford scores
 * (documented assumption — see README "Draw numbers"). No padding, no
 * random fill: a user with 3 scores has a 3-number ticket.
 */
export function deriveTicketNumbers(scores: { strokes: number }[]): number[] {
  return scores.map((s) => s.strokes);
}
