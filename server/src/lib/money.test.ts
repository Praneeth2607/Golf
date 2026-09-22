import { describe, expect, it } from "vitest";
import { percentageOfPaise } from "./money";

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
