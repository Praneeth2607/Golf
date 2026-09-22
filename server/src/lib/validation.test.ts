import { describe, expect, it } from "vitest";
import { charityPercentageSchema, stablefordScoreSchema } from "./validation";

describe("stablefordScoreSchema", () => {
  it("accepts the full valid range", () => {
    expect(stablefordScoreSchema.safeParse(1).success).toBe(true);
    expect(stablefordScoreSchema.safeParse(45).success).toBe(true);
    expect(stablefordScoreSchema.safeParse(23).success).toBe(true);
  });

  it("rejects a score below 1", () => {
    expect(stablefordScoreSchema.safeParse(0).success).toBe(false);
    expect(stablefordScoreSchema.safeParse(-5).success).toBe(false);
  });

  it("rejects a score above 45", () => {
    expect(stablefordScoreSchema.safeParse(46).success).toBe(false);
    expect(stablefordScoreSchema.safeParse(100).success).toBe(false);
  });

  it("rejects a non-integer score", () => {
    expect(stablefordScoreSchema.safeParse(20.5).success).toBe(false);
  });
});

describe("charityPercentageSchema", () => {
  const schema = charityPercentageSchema(10);

  it("accepts exactly the minimum", () => {
    expect(schema.safeParse(10).success).toBe(true);
  });

  it("rejects below the minimum", () => {
    const result = schema.safeParse(9.99);
    expect(result.success).toBe(false);
  });

  it("accepts a voluntarily raised percentage", () => {
    expect(schema.safeParse(25).success).toBe(true);
    expect(schema.safeParse(100).success).toBe(true);
  });

  it("rejects above 100%", () => {
    expect(schema.safeParse(101).success).toBe(false);
  });

  it("honors a different configured minimum", () => {
    const stricter = charityPercentageSchema(20);
    expect(stricter.safeParse(15).success).toBe(false);
    expect(stricter.safeParse(20).success).toBe(true);
  });
});
