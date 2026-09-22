import { describe, expect, it } from "vitest";
import { percentageOfPaise, splitEqually } from "./money";

describe("percentageOfPaise", () => {
  it("computes the minimum 10% charity contribution", () => {
    expect(percentageOfPaise(49_900, 10)).toBe(4_990);
    expect(percentageOfPaise(499_900, 10)).toBe(49_990);
  });

  it("handles a user-raised percentage", () => {
    expect(percentageOfPaise(49_900, 25)).toBe(12_475);
  });

  it("handles fractional percentages without drifting off integer paise", () => {
    expect(percentageOfPaise(49_900, 12.5)).toBe(6_238); // 6237.5 rounds up
  });

  it("never returns a fractional paisa amount", () => {
    for (const pct of [10, 10.1, 33.33, 99.99]) {
      expect(Number.isInteger(percentageOfPaise(12_345, pct))).toBe(true);
    }
  });

  it("returns 0 for a 0 amount regardless of percentage", () => {
    expect(percentageOfPaise(0, 50)).toBe(0);
  });
});

describe("splitEqually", () => {
  it("splits evenly when it divides cleanly", () => {
    expect(splitEqually(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("distributes the remainder one paisa at a time, never losing money", () => {
    const shares = splitEqually(1001, 4);
    expect(shares).toEqual([251, 250, 250, 250]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it("handles a remainder larger than 1", () => {
    const shares = splitEqually(103, 5); // 20 each, 3 paise left over
    expect(shares).toEqual([21, 21, 21, 20, 20]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(103);
  });

  it("returns an empty array for zero parts", () => {
    expect(splitEqually(500, 0)).toEqual([]);
  });

  it("gives a single winner the whole pool", () => {
    expect(splitEqually(4990, 1)).toEqual([4990]);
  });
});
