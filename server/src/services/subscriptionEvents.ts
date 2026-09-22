import { SubscriptionEventType, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../lib/audit";
import type { NormalizedEventType } from "../lib/payments";

const EVENT_TYPE_MAP: Record<NormalizedEventType, SubscriptionEventType> = {
  ACTIVATED: "CHECKOUT_COMPLETED",
  CHARGED: "RENEWED",
  CANCELLED: "CANCELLED",
  COMPLETED: "EXPIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
};

const STATUS_MAP: Record<NormalizedEventType, SubscriptionStatus> = {
  ACTIVATED: "ACTIVE",
  CHARGED: "ACTIVE",
  CANCELLED: "CANCELLED",
  COMPLETED: "LAPSED",
  PAYMENT_FAILED: "PAST_DUE",
};

interface ApplyParams {
  providerSubscriptionId: string;
  type: NormalizedEventType;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  idempotencyKey: string;
  raw: unknown;
}

/**
 * The single place that mutates subscription status. Called from the
 * Razorpay webhook handler and from the mock-provider's /simulate endpoint,
 * so both paths produce identical DB state and an identical audit trail —
 * the only thing that differs is how the event was sourced.
 */
export async function applySubscriptionEvent(params: ApplyParams): Promise<
  | { outcome: "applied" }
  | { outcome: "duplicate" }
  | { outcome: "unknown_subscription" }
> {
  const subscription = await prisma.subscription.findUnique({
    where: { providerSubscriptionId: params.providerSubscriptionId },
  });
  if (!subscription) {
    return { outcome: "unknown_subscription" };
  }

  const alreadyProcessed = await prisma.subscriptionEvent.findUnique({
    where: { providerEventId: params.idempotencyKey },
  });
  if (alreadyProcessed) {
    return { outcome: "duplicate" };
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: STATUS_MAP[params.type],
        currentPeriodStart: params.currentPeriodStart ?? subscription.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd ?? subscription.currentPeriodEnd,
        cancelAtPeriodEnd: params.type === "CANCELLED" ? false : subscription.cancelAtPeriodEnd,
      },
    }),
    prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        type: EVENT_TYPE_MAP[params.type],
        providerEventId: params.idempotencyKey,
        metadata: params.raw as never,
      },
    }),
  ]);

  await recordAudit({
    action: `SUBSCRIPTION_${params.type}`,
    entityType: "subscription",
    entityId: subscription.id,
    metadata: { providerSubscriptionId: params.providerSubscriptionId },
  });

  return { outcome: "applied" };
}
