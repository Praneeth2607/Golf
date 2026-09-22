import { mulberry32, pickUniqueUniform, pickUniqueWeighted } from "../lib/rng";

// Ticket numbers are a subscriber's own Stableford scores (1-45), so the
// winning-number range matches that scale — see server/src/draw/tickets.ts
// and README's "Draw numbers (documented assumption)".
export const NUMBER_RANGE = 45;
export const WINNING_NUMBERS_COUNT = 5;

/** Standard lottery-style draw — every number equally likely. */
export function generateRandomDraw(seed: string): number[] {
  const rng = mulberry32(seed);
  return pickUniqueUniform(rng, NUMBER_RANGE, WINNING_NUMBERS_COUNT).sort((a, b) => a - b);
}

/**
 * Weighted by score frequency: numbers that appear on more subscribers'
 * tickets (i.e. scores more people actually shot) are more likely to be
 * drawn. This is a deliberate design choice — it raises the average match
 * rate across the whole subscriber base rather than picking numbers
 * independent of what anyone could plausibly hold, making "algorithmic"
 * mode meaningfully different from "random" rather than a relabeling of it.
 */
export function generateAlgorithmicDraw(seed: string, ticketNumbers: number[][]): number[] {
  const frequency = new Map<number, number>();
  for (const ticket of ticketNumbers) {
    for (const n of ticket) {
      frequency.set(n, (frequency.get(n) ?? 0) + 1);
    }
  }

  const rng = mulberry32(seed);
  return pickUniqueWeighted(rng, NUMBER_RANGE, WINNING_NUMBERS_COUNT, frequency).sort((a, b) => a - b);
}
