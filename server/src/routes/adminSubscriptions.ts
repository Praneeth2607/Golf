import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { paymentProvider } from "../lib/payments";

export const adminSubscriptionsRouter = Router();

adminSubscriptionsRouter.use(requireAuth, requireRole("ADMIN"));

const listQuerySchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELLED", "LAPSED", "INCOMPLETE"]).optional(),
  userId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
});

// GET /api/admin/subscriptions — operational list across every user, with filters.
adminSubscriptionsRouter.get("/", async (req, res, next) => {
  try {
    const { status, userId, q } = listQuerySchema.parse(req.query);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(userId ? { userId } : {}),
        ...(q
          ? { user: { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        charity: { select: { name: true } },
      },
    });

    res.json({ subscriptions });
  } catch (err) {
    next(err);
  }
});

const cancelSchema = z.object({ immediately: z.boolean().optional().default(false) });

// POST /api/admin/subscriptions/:id/cancel — admin override cancellation
// (e.g. fraud, support request) — same provider call the self-service
// cancel endpoint uses, just without the ownership check.
adminSubscriptionsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const { immediately } = cancelSchema.parse(req.body ?? {});

    const subscription = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!subscription) throw new ApiError(404, "Subscription not found");
    if (!["ACTIVE", "PAST_DUE"].includes(subscription.status)) {
      throw new ApiError(409, `Cannot cancel a subscription that is ${subscription.status}`);
    }
    if (!subscription.providerSubscriptionId) throw new ApiError(500, "Subscription has no provider reference");

    await paymentProvider.cancelSubscription(subscription.providerSubscriptionId, !immediately);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: !immediately },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "SUBSCRIPTION_CANCELLED_BY_ADMIN",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { userId: subscription.userId, immediately },
    });

    res.json({ subscription: updated });
  } catch (err) {
    next(err);
  }
});
