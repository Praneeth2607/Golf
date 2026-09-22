import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../env";
import type {
  CheckoutSession,
  NormalizedEventType,
  NormalizedSubscriptionEvent,
  PaymentProvider,
  PlanDetails,
  PlanKey,
} from "./types";

/**
 * Razorpay subscriptions require a finite `total_count` of billing cycles —
 * there's no native "until cancelled" mode. We use a long-but-finite count
 * (30 years) so subscriptions behave as effectively open-ended; the user can
 * cancel any time via POST /api/subscriptions/cancel.
 */
const TOTAL_COUNT: Record<PlanKey, number> = { MONTHLY: 360, YEARLY: 30 };

const EVENT_MAP: Record<string, NormalizedEventType> = {
  "subscription.activated": "ACTIVATED",
  "subscription.charged": "CHARGED",
  "subscription.cancelled": "CANCELLED",
  "subscription.completed": "COMPLETED",
  "payment.failed": "PAYMENT_FAILED",
};

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: { id: string; current_start?: number | null; current_end?: number | null } };
  };
}

function toDate(unixSeconds?: number | null) {
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

function requireConfig() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_PLAN_ID_MONTHLY, RAZORPAY_PLAN_ID_YEARLY } = env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_WEBHOOK_SECRET || !RAZORPAY_PLAN_ID_MONTHLY || !RAZORPAY_PLAN_ID_YEARLY) {
    throw new Error(
      "PAYMENT_PROVIDER=razorpay but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET / " +
        "RAZORPAY_PLAN_ID_MONTHLY / RAZORPAY_PLAN_ID_YEARLY are not all set. Set PAYMENT_PROVIDER=mock to run without them."
    );
  }
  return { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_PLAN_ID_MONTHLY, RAZORPAY_PLAN_ID_YEARLY };
}

let cache: { data: PlanDetails[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

export const razorpayProvider: PaymentProvider = {
  name: "razorpay",

  async getPlans() {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

    const cfg = requireConfig();
    const client = new Razorpay({ key_id: cfg.RAZORPAY_KEY_ID, key_secret: cfg.RAZORPAY_KEY_SECRET });
    const planIds: Record<PlanKey, string> = {
      MONTHLY: cfg.RAZORPAY_PLAN_ID_MONTHLY,
      YEARLY: cfg.RAZORPAY_PLAN_ID_YEARLY,
    };

    const entries = await Promise.all(
      (Object.entries(planIds) as [PlanKey, string][]).map(async ([plan, id]) => {
        const rp = await client.plans.fetch(id);
        return {
          plan,
          providerPlanId: rp.id,
          amountPaise: Number(rp.item.amount),
          currency: rp.item.currency,
          interval: rp.period,
        } satisfies PlanDetails;
      })
    );

    cache = { data: entries, fetchedAt: Date.now() };
    return entries;
  },

  async createSubscriptionCheckout({ plan }): Promise<CheckoutSession> {
    const cfg = requireConfig();
    const client = new Razorpay({ key_id: cfg.RAZORPAY_KEY_ID, key_secret: cfg.RAZORPAY_KEY_SECRET });
    const planId = plan === "MONTHLY" ? cfg.RAZORPAY_PLAN_ID_MONTHLY : cfg.RAZORPAY_PLAN_ID_YEARLY;

    const sub = await client.subscriptions.create({
      plan_id: planId,
      total_count: TOTAL_COUNT[plan],
      customer_notify: 1,
      notes: { plan },
    });

    return {
      providerSubscriptionId: sub.id,
      mode: "redirect",
      checkout: { razorpayKeyId: cfg.RAZORPAY_KEY_ID, razorpaySubscriptionId: sub.id },
    };
  },

  async cancelSubscription(providerSubscriptionId, atCycleEnd) {
    const cfg = requireConfig();
    const client = new Razorpay({ key_id: cfg.RAZORPAY_KEY_ID, key_secret: cfg.RAZORPAY_KEY_SECRET });
    await client.subscriptions.cancel(providerSubscriptionId, atCycleEnd);
  },

  verifyWebhookSignature(rawBody, signature) {
    if (!signature) return false;
    const cfg = requireConfig();
    const expected = crypto.createHmac("sha256", cfg.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  },

  parseWebhookEvent(rawBody): NormalizedSubscriptionEvent | null {
    const payload = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
    const type = EVENT_MAP[payload.event];
    const sub = payload.payload.subscription?.entity;
    if (!type || !sub) return null;

    return {
      type,
      providerSubscriptionId: sub.id,
      currentPeriodStart: toDate(sub.current_start),
      currentPeriodEnd: toDate(sub.current_end),
      // Razorpay doesn't guarantee a stable top-level event id across payload
      // shapes, so derive idempotency from the verified raw body itself.
      idempotencyKey: crypto.createHash("sha256").update(rawBody).digest("hex"),
      raw: payload,
    };
  },
};
