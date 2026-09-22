import { describe, expect, it } from "vitest";
import { generateAlgorithmicDraw, generateRandomDraw, NUMBER_RANGE, WINNING_NUMBERS_COUNT } from "./numberGeneration";

function isValidDraw(numbers: number[]) {
  expect(numbers).toHaveLength(WINNING_NUMBERS_COUNT);
  expect(new Set(numbers).size).toBe(WINNING_NUMBERS_COUNT); // no duplicates
  for (const n of numbers) {
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(NUMBER_RANGE);
  }
}

describe("generateRandomDraw", () => {
  it("produces 5 distinct numbers in range", () => {
    isValidDraw(generateRandomDraw("seed-1"));
  });

  it("is deterministic for the same seed", () => {
    expect(generateRandomDraw("2026-09-draw")).toEqual(generateRandomDraw("2026-09-draw"));
  });

  it("differs for different seeds (not a hard guarantee, but should hold for these)", () => {
    expect(generateRandomDraw("seed-a")).not.toEqual(generateRandomDraw("seed-b"));
  });
});

describe("generateAlgorithmicDraw", () => {
  it("produces 5 distinct numbers in range even with no ticket data", () => {
    isValidDraw(generateAlgorithmicDraw("seed-1", []));
  });

  it("is deterministic for the same seed and ticket set", () => {
    const tickets = [
      [1, 2, 3, 4, 5],
      [1, 2, 6, 7, 8],
    ];
    expect(generateAlgorithmicDraw("seed-x", tickets)).toEqual(generateAlgorithmicDraw("seed-x", tickets));
  });

  it("is heavily biased toward numbers that appear on more tickets", () => {
    // Number 7 appears on every ticket; numbers 40-45 appear on none.
    const tickets = Array.from({ length: 50 }, () => [7, 7, 7, 7, 7]);
    let sevenCount = 0;
    for (let i = 0; i < 100; i++) {
      const draw = generateAlgorithmicDraw(`bias-${i}`, tickets);
      if (draw.includes(7)) sevenCount++;
    }
    // With 7 weighted 250x any other number, it should be drawn almost every time.
    expect(sevenCount).toBeGreaterThan(90);
  });
});
