import { Prisma, SubscriptionEventType, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../lib/audit";
import { percentageOfPaise } from "../lib/money";
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

  const periodStart = params.currentPeriodStart ?? subscription.currentPeriodStart;
  const periodEnd = params.currentPeriodEnd ?? subscription.currentPeriodEnd;

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: STATUS_MAP[params.type],
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
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
  ];

  // A charge (first activation or renewal) that actually moves money is the
  // moment the charity's share becomes a real, traceable transaction — not
  // when the user merely picks a charity. Skipped if no charity has been
  // chosen yet; the user can still set one later and it'll apply from their
  // next charge onward.
  const isChargeEvent = params.type === "ACTIVATED" || params.type === "CHARGED";
  if (isChargeEvent && subscription.charityId && periodStart) {
    operations.push(
      prisma.charityContribution.upsert({
        where: { subscriptionId_periodStart: { subscriptionId: subscription.id, periodStart } },
        create: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          charityId: subscription.charityId,
          percentage: subscription.charityPercentage,
          amountPaise: percentageOfPaise(subscription.amountPaise, subscription.charityPercentage.toString()),
          periodStart,
          periodEnd: periodEnd ?? periodStart,
        },
        update: {}, // idempotent: a duplicate event for the same period changes nothing
      })
    );
  }

  await prisma.$transaction(operations);

  await recordAudit({
    action: `SUBSCRIPTION_${params.type}`,
    entityType: "subscription",
    entityId: subscription.id,
    metadata: { providerSubscriptionId: params.providerSubscriptionId },
  });

  return { outcome: "applied" };
}
