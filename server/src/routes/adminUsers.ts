import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireRole("ADMIN"));

const listQuerySchema = z.object({ q: z.string().trim().max(200).optional() });

// GET /api/admin/users — search by email/name; each row includes just
// enough to triage (role, latest subscription status, score count).
adminUsersRouter.get("/", async (req, res, next) => {
  try {
    const { q } = listQuerySchema.parse(req.query);

    const profiles = await prisma.profile.findMany({
      where: q
        ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, plan: true } },
        _count: { select: { scores: true } },
      },
    });

    res.json({
      users: profiles.map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.fullName,
        role: p.role,
        createdAt: p.createdAt,
        latestSubscription: p.subscriptions[0] ?? null,
        scoreCount: p._count.scores,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id — full detail for the admin user-detail view.
adminUsersRouter.get("/:id", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!profile) throw new ApiError(404, "User not found");

    const [scores, contributions, donations, winners] = await Promise.all([
      prisma.score.findMany({ where: { userId: profile.id }, orderBy: { playedOn: "desc" } }),
      prisma.charityContribution.aggregate({ where: { userId: profile.id }, _sum: { amountPaise: true } }),
      prisma.donation.aggregate({ where: { userId: profile.id }, _sum: { amountPaise: true } }),
      prisma.drawWinner.findMany({
        where: { userId: profile.id },
        include: { payout: true, verification: true, draw: { select: { periodLabel: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      user: {
        ...profile,
        scores,
        totalCharityContributedPaise: contributions._sum.amountPaise ?? 0,
        totalDonatedPaise: donations._sum.amountPaise ?? 0,
        winners,
        totalWonPaise: winners.reduce((sum, w) => sum + w.prizeAmountPaise, 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  role: z.enum(["SUBSCRIBER", "ADMIN"]).optional(),
});

// PATCH /api/admin/users/:id — edit profile / change role.
adminUsersRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);

    if (body.role && req.params.id === req.user!.id) {
      throw new ApiError(400, "You can't change your own role — ask another admin to do it");
    }

    const profile = await prisma.profile.update({ where: { id: req.params.id }, data: body });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "USER_UPDATED_BY_ADMIN",
      entityType: "profile",
      entityId: profile.id,
      metadata: body,
    });

    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
});
