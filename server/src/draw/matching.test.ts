import { describe, expect, it } from "vitest";
import { calculateMatches } from "./matching";

describe("calculateMatches", () => {
  const winning = [3, 12, 19, 27, 41];

  it("returns FIVE for a full match", () => {
    expect(calculateMatches([3, 12, 19, 27, 41], winning)).toBe("FIVE");
  });

  it("returns FIVE regardless of ticket number order", () => {
    expect(calculateMatches([41, 27, 3, 19, 12], winning)).toBe("FIVE");
  });

  it("returns FOUR for a 4-number match", () => {
    expect(calculateMatches([3, 12, 19, 27, 2], winning)).toBe("FOUR");
  });

  it("returns THREE for a 3-number match", () => {
    expect(calculateMatches([3, 12, 19, 2, 8], winning)).toBe("THREE");
  });

  it("returns null below the minimum match tier", () => {
    expect(calculateMatches([3, 12, 5, 8, 9], winning)).toBe(null);
    expect(calculateMatches([], winning)).toBe(null);
  });

  it("does not let duplicate ticket numbers inflate the match count", () => {
    // Ticket has "3" three times (e.g. shot the same score more than once) —
    // should still only count as one match against the winning set.
    expect(calculateMatches([3, 3, 3, 12, 19], winning)).toBe("THREE");
  });

  it("caps a partial (fewer than 5 numbers) ticket at the tier it has numbers for", () => {
    // A user with only 3 logged scores can reach at most a THREE match,
    // even if all 3 of their numbers are winners.
    expect(calculateMatches([3, 12, 19], winning)).toBe("THREE");
  });
});
