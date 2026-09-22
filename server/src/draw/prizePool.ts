import { percentageOfPaise } from "../lib/money";

export interface TierPercentages {
  tier5Pct: number | string;
  tier4Pct: number | string;
  tier3Pct: number | string;
}

export interface TierPools {
  tier5: number;
  tier4: number;
  tier3: number;
}

/**
 * PRD §07: "A fixed portion of each subscription contributes to the prize
 * pool." Each eligible subscriber contributes independently off their own
 * subscription amount (monthly vs. yearly payers contribute proportionally
 * different absolute amounts) — summed, not averaged.
 */
export function calculatePrizePool(eligibleAmountsPaise: number[], prizePoolPct: number | string): number {
  return eligibleAmountsPaise.reduce((sum, amountPaise) => sum + percentageOfPaise(amountPaise, prizePoolPct), 0);
}

/** Splits the total pool into the 40/35/25 (configurable) tiers, folding in any rolled-over jackpot. */
export function calculatePrizeTiers(
  prizePoolPaise: number,
  pct: TierPercentages,
  jackpotRolloverInPaise = 0
): TierPools {
  return {
    tier5: percentageOfPaise(prizePoolPaise, pct.tier5Pct) + jackpotRolloverInPaise,
    tier4: percentageOfPaise(prizePoolPaise, pct.tier4Pct),
    tier3: percentageOfPaise(prizePoolPaise, pct.tier3Pct),
  };
}

/**
 * PRD §07: 5-number jackpot rolls forward if unclaimed; 4- and 3-number
 * tiers do not (an unclaimed 4/3 tier simply isn't paid out that month —
 * the PRD doesn't specify a destination for it, so it's not redistributed
 * or rolled anywhere; documented assumption).
 */
export function applyJackpotRollover(
  tier5PoolPaise: number,
  hasFiveWinners: boolean
): { distributedPaise: number; rolloverOutPaise: number } {
  return hasFiveWinners
    ? { distributedPaise: tier5PoolPaise, rolloverOutPaise: 0 }
    : { distributedPaise: 0, rolloverOutPaise: tier5PoolPaise };
}
