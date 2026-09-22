import { describe, expect, it } from "vitest";
import { canMarkPaid, canReview, canSubmitProof } from "./verificationTransitions";

describe("canSubmitProof", () => {
  it("allows submission from AWAITING_PROOF", () => {
    expect(canSubmitProof("AWAITING_PROOF")).toBe(true);
  });
  it("allows resubmission after a rejection", () => {
    expect(canSubmitProof("REJECTED")).toBe(true);
  });
  it("blocks submission once already SUBMITTED or APPROVED", () => {
    expect(canSubmitProof("SUBMITTED")).toBe(false);
    expect(canSubmitProof("APPROVED")).toBe(false);
  });
});

describe("canReview", () => {
  it("only allows review of SUBMITTED proof", () => {
    expect(canReview("SUBMITTED")).toBe(true);
    expect(canReview("AWAITING_PROOF")).toBe(false);
    expect(canReview("APPROVED")).toBe(false);
    expect(canReview("REJECTED")).toBe(false);
  });
});

describe("canMarkPaid", () => {
  it("allows payout only when approved and still pending", () => {
    expect(canMarkPaid("APPROVED", "PENDING")).toBe(true);
  });
  it("blocks payout without approval", () => {
    expect(canMarkPaid("SUBMITTED", "PENDING")).toBe(false);
    expect(canMarkPaid("AWAITING_PROOF", "PENDING")).toBe(false);
  });
  it("blocks a duplicate payout attempt", () => {
    expect(canMarkPaid("APPROVED", "PAID")).toBe(false);
  });
});
