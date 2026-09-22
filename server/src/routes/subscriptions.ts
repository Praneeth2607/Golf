import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { paymentProvider } from "../lib/payments";
import { requireAuth } from "../middleware/auth";
import { requireActiveSubscription } from "../middleware/subscription";
import { recordAudit } from "../lib/audit";
import { applySubscriptionEvent } from "../services/subscriptionEvents";
import { ApiError } from "../middleware/errorHandler";
import { env } from "../lib/env";
import { charityPercentageSchema } from "../lib/validation";

export const subscriptionsRouter = Router();

// GET /api/subscriptions/plans — public, used by the pricing page and the
// subscribe flow. Amounts always come from the active payment provider,
// never hardcoded on the frontend.
subscriptionsRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await paymentProvider.getPlans();
    res.json({ provider: paymentProvider.name, plans });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions — the caller's own subscription history.
subscriptionsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { charity: true },
    });
    res.json({ subscriptions });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/status — the caller's current (most recent) subscription.
subscriptionsRouter.get("/status", requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { charity: true },
    });
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

const checkoutSchema = z.object({
  plan: z.enum(["MONTHLY", "YEARLY"]),
});

// POST /api/subscriptions/checkout
// Creates a provider-side subscription and a local INCOMPLETE record, then
// returns what the frontend needs to complete checkout. The subscription
// only becomes ACTIVE once a `subscription.activated` event is applied
// (real webhook for Razorpay, /mock/simulate for the mock provider) — never
// on this response alone.
subscriptionsRouter.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const { plan } = checkoutSchema.parse(req.body);
    const userId = req.user!.id;

    const existingActive = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    });
    if (existingActive) {
      throw new ApiError(409, "You already have an active subscription");
    }

    const plans = await paymentProvider.getPlans();
    const planDetails = plans.find((p) => p.plan === plan);
    if (!planDetails) throw new ApiError(500, `Plan ${plan} is not configured`);

    const session = await paymentProvider.createSubscriptionCheckout({
      plan,
      userId,
      userEmail: req.user!.email,
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: "INCOMPLETE",
        amountPaise: planDetails.amountPaise,
        currency: planDetails.currency,
        paymentProvider: paymentProvider.name,
        providerSubscriptionId: session.providerSubscriptionId,
      },
    });

    await recordAudit({
      actorId: userId,
      actorRole: req.user!.role,
      action: "SUBSCRIPTION_CHECKOUT_STARTED",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { plan, provider: paymentProvider.name, providerSubscriptionId: session.providerSubscriptionId },
    });

    res.status(201).json({
      subscriptionId: subscription.id,
      provider: paymentProvider.name,
      mode: session.mode,
      checkout: session.checkout,
      amountPaise: planDetails.amountPaise,
      currency: planDetails.currency,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/cancel
// Cancels at the end of the current billing cycle by default (the user keeps
// access they've already paid for). The row's status flips to CANCELLED via
// the same event pipeline as activation (webhook or mock simulate), not here.
const cancelSchema = z.object({
  immediately: z.boolean().optional().default(false),
});

subscriptionsRouter.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const { immediately } = cancelSchema.parse(req.body ?? {});
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription || !subscription.providerSubscriptionId) {
      throw new ApiError(404, "No active subscription to cancel");
    }

    await paymentProvider.cancelSubscription(subscription.providerSubscriptionId, !immediately);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: !immediately },
    });

    await recordAudit({
      actorId: userId,
      actorRole: req.user!.role,
      action: "SUBSCRIPTION_CANCEL_REQUESTED",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { immediately },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Charity selection & contribution history
// ---------------------------------------------------------------------------

const charitySelectionSchema = z.object({
  charityId: z.string().uuid(),
  percentage: z.coerce.number().pipe(charityPercentageSchema(env.CHARITY_MIN_PERCENTAGE)),
});

// PATCH /api/subscriptions/charity
// Sets or updates the caller's charity + contribution percentage on their
// active subscription. Takes effect from the next charge onward (see
// applySubscriptionEvent) — it does not retroactively touch past
// CharityContribution rows, which are an immutable record of what was
// actually charged at the time.
subscriptionsRouter.patch("/charity", requireAuth, requireActiveSubscription, async (req, res, next) => {
  try {
    const { charityId, percentage } = charitySelectionSchema.parse(req.body);

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (!charity || !charity.isActive) {
      throw new ApiError(400, "Selected charity is not available");
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) {
      throw new ApiError(404, "No active subscription");
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { charityId, charityPercentage: percentage },
      include: { charity: true },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "SUBSCRIPTION_CHARITY_SELECTED",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { charityId, percentage },
    });

    res.json({ subscription: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/contributions — the caller's charity contribution history + total.
subscriptionsRouter.get("/contributions", requireAuth, async (req, res, next) => {
  try {
    const contributions = await prisma.charityContribution.findMany({
      where: { userId: req.user!.id },
      orderBy: { periodStart: "desc" },
      include: { charity: { select: { id: true, name: true, slug: true } } },
    });

    const totalPaise = contributions.reduce((sum, c) => sum + c.amountPaise, 0);

    res.json({ contributions, totalPaise });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Mock-provider only: lets the signed-in user (or a demo/admin flow) drive a
// checkout through its full lifecycle without a real gateway. Mirrors
// exactly what a Razorpay webhook would do, via the same applySubscriptionEvent
// service, so the rest of the app can't tell the difference. Disabled unless
// PAYMENT_PROVIDER=mock.
// ---------------------------------------------------------------------------

const simulateSchema = z.object({
  subscriptionId: z.string().uuid(),
  event: z.enum(["ACTIVATED", "CHARGED", "CANCELLED", "COMPLETED", "PAYMENT_FAILED"]),
});

subscriptionsRouter.post("/mock/simulate", requireAuth, async (req, res, next) => {
  try {
    if (paymentProvider.name !== "mock") {
      throw new ApiError(404, "Mock simulation is only available when PAYMENT_PROVIDER=mock");
    }

    const { subscriptionId, event } = simulateSchema.parse(req.body);
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId: req.user!.id },
    });
    if (!subscription || !subscription.providerSubscriptionId) {
      throw new ApiError(404, "Subscription not found");
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (subscription.plan === "MONTHLY") periodEnd.setMonth(periodEnd.getMonth() + 1);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const result = await applySubscriptionEvent({
      providerSubscriptionId: subscription.providerSubscriptionId,
      type: event,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      idempotencyKey: `mock_${subscription.providerSubscriptionId}_${event}_${now.getTime()}`,
      raw: { simulated: true, event },
    });

    if (result.outcome === "unknown_subscription") {
      throw new ApiError(404, "Subscription not found on provider side");
    }

    res.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    next(err);
  }
});
