import type { PayoutStatus, VerificationStatus } from "@prisma/client";

/**
 * PRD §13 workflow: AWAITING_PROOF -> SUBMITTED -> APPROVED/REJECTED ->
 * (if approved) payout PENDING -> PAID. Centralized here so every route
 * checks the same rules instead of re-deriving them inline, and so the
 * rules themselves are unit-testable without a database.
 */

/** A winner may (re-)submit proof from the initial state or after a rejection. */
export function canSubmitProof(status: VerificationStatus): boolean {
  return status === "AWAITING_PROOF" || status === "REJECTED";
}

/** Admin can only approve/reject proof that's actually been submitted. */
export function canReview(status: VerificationStatus): boolean {
  return status === "SUBMITTED";
}

/** A payout can only be marked paid once verification is approved, and only once. */
export function canMarkPaid(verificationStatus: VerificationStatus, payoutStatus: PayoutStatus): boolean {
  return verificationStatus === "APPROVED" && payoutStatus === "PENDING";
}
