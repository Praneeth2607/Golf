import { describe, expect, it } from "vitest";
import { applyJackpotRollover, calculatePrizePool, calculatePrizeTiers } from "./prizePool";

describe("calculatePrizePool", () => {
  it("sums each eligible subscriber's own contribution at the configured percentage", () => {
    // 3 monthly (49_900) + 1 yearly (499_900) subscribers, 20% pool cut.
    const amounts = [49_900, 49_900, 49_900, 499_900];
    expect(calculatePrizePool(amounts, 20)).toBe(9_980 * 3 + 99_980);
  });

  it("returns 0 with no eligible subscribers", () => {
    expect(calculatePrizePool([], 20)).toBe(0);
  });
});

describe("calculatePrizeTiers", () => {
  const pct = { tier5Pct: 40, tier4Pct: 35, tier3Pct: 25 };

  it("splits the pool 40/35/25 with no rollover", () => {
    expect(calculatePrizeTiers(100_000, pct)).toEqual({ tier5: 40_000, tier4: 35_000, tier3: 25_000 });
  });

  it("adds a jackpot rollover only to tier 5", () => {
    expect(calculatePrizeTiers(100_000, pct, 15_000)).toEqual({ tier5: 55_000, tier4: 35_000, tier3: 25_000 });
  });

  it("the three tiers always sum to the pool (excluding rollover)", () => {
    const tiers = calculatePrizeTiers(123_457, pct);
    expect(tiers.tier5 + tiers.tier4 + tiers.tier3).toBeLessThanOrEqual(123_457);
    expect(tiers.tier5 + tiers.tier4 + tiers.tier3).toBeGreaterThan(123_457 - 3); // rounding drift bounded
  });
});

describe("applyJackpotRollover", () => {
  it("distributes the tier 5 pool when there are winners", () => {
    expect(applyJackpotRollover(40_000, true)).toEqual({ distributedPaise: 40_000, rolloverOutPaise: 0 });
  });

  it("rolls the whole tier 5 pool forward when there are no winners", () => {
    expect(applyJackpotRollover(40_000, false)).toEqual({ distributedPaise: 0, rolloverOutPaise: 40_000 });
  });
});
