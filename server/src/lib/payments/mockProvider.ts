import crypto from "crypto";
import type { CheckoutSession, PaymentProvider, PlanDetails, PlanKey } from "./types";

// Same documented pricing assumption as the Razorpay setup script
// (src/scripts/createPlans.ts) — the PRD doesn't set a price.
const MOCK_PLANS: Record<PlanKey, PlanDetails> = {
  MONTHLY: { plan: "MONTHLY", providerPlanId: "mock_plan_monthly", amountPaise: 49_900, currency: "INR", interval: "monthly" },
  YEARLY: { plan: "YEARLY", providerPlanId: "mock_plan_yearly", amountPaise: 499_900, currency: "INR", interval: "yearly" },
};

/**
 * Simulates a payment gateway entirely in-process — no external account,
 * no KYC, no network calls. Used while a real gateway (Razorpay) isn't
 * available (see PAYMENT_PROVIDER in src/lib/env.ts). The checkout flow
 * still goes through the real Subscription/SubscriptionEvent tables and the
 * same status machine as the live provider — only the "money moved" step is
 * faked, via POST /api/subscriptions/mock/simulate instead of a webhook.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",

  async getPlans() {
    return Object.values(MOCK_PLANS);
  },

  async createSubscriptionCheckout({ plan }): Promise<CheckoutSession> {
    const providerSubscriptionId = `mock_sub_${crypto.randomUUID()}`;
    return {
      providerSubscriptionId,
      mode: "mock",
      checkout: { plan, providerSubscriptionId },
    };
  },

  async cancelSubscription() {
    // Nothing external to call — the DB row is updated by the caller.
  },

  verifyWebhookSignature() {
    return false; // the mock provider never receives real webhooks
  },

  parseWebhookEvent() {
    return null;
  },
};
