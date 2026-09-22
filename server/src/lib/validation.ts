import { z } from "zod";

/**
 * Shared Zod schemas for business rules the PRD calls out explicitly enough
 * to test directly (§24): Stableford score range, minimum charity
 * contribution percentage. Kept here, separate from the route files that
 * use them, so they're importable in tests without pulling in Express/
 * Prisma/env wiring — same reasoning as the pure modules in src/draw/.
 */

export const stablefordScoreSchema = z
  .number()
  .int()
  .min(1, "Score must be between 1 and 45")
  .max(45, "Score must be between 1 and 45");

export function charityPercentageSchema(minPercentage: number) {
  return z
    .number()
    .min(minPercentage, `Charity contribution must be at least ${minPercentage}%`)
    .max(100, "Charity contribution cannot exceed 100%");
}
