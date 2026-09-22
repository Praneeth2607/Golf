import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/reports — PRD §11.E: total users, total prize pool, charity
// contribution totals, draw statistics, gathered in one call for the admin
// overview/reports pages.
reportsRouter.get("/", async (_req, res, next) => {
  try {
    const [
      totalUsers,
      subscribersByStatus,
      contributionTotal,
      donationTotal,
      prizePoolTotal,
      paidOutTotal,
      pendingPayoutTotal,
      drawCounts,
      winnersByTier,
      charityBreakdown,
    ] = await Promise.all([
      prisma.profile.count({ where: { role: "SUBSCRIBER" } }),
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.charityContribution.aggregate({ _sum: { amountPaise: true } }),
      prisma.donation.aggregate({ _sum: { amountPaise: true } }),
      prisma.draw.aggregate({ where: { status: "PUBLISHED" }, _sum: { prizePoolPaise: true } }),
      prisma.payout.aggregate({ where: { status: "PAID" }, _sum: { amountPaise: true } }),
      prisma.payout.aggregate({ where: { status: "PENDING" }, _sum: { amountPaise: true } }),
      prisma.draw.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.drawWinner.groupBy({ by: ["matchTier"], _count: { _all: true } }),
      prisma.charityContribution.groupBy({
        by: ["charityId"],
        _sum: { amountPaise: true },
        _count: { _all: true },
        orderBy: { _sum: { amountPaise: "desc" } },
      }),
    ]);

    const charities = await prisma.charity.findMany({
      where: { id: { in: charityBreakdown.map((c) => c.charityId) } },
      select: { id: true, name: true },
    });
    const charityNameById = new Map(charities.map((c) => [c.id, c.name]));

    res.json({
      totalUsers,
      subscribersByStatus: Object.fromEntries(subscribersByStatus.map((s) => [s.status, s._count._all])),
      totalCharityContributedPaise: contributionTotal._sum.amountPaise ?? 0,
      totalDonatedPaise: donationTotal._sum.amountPaise ?? 0,
      totalPrizePoolPaise: prizePoolTotal._sum.prizePoolPaise ?? 0,
      totalPaidOutPaise: paidOutTotal._sum.amountPaise ?? 0,
      totalPendingPayoutPaise: pendingPayoutTotal._sum.amountPaise ?? 0,
      draws: {
        total: drawCounts.reduce((sum, d) => sum + d._count._all, 0),
        byStatus: Object.fromEntries(drawCounts.map((d) => [d.status, d._count._all])),
      },
      winnersByTier: Object.fromEntries(winnersByTier.map((w) => [w.matchTier, w._count._all])),
      charityBreakdown: charityBreakdown.map((c) => ({
        charityId: c.charityId,
        name: charityNameById.get(c.charityId) ?? "Unknown",
        totalPaise: c._sum.amountPaise ?? 0,
        contributionCount: c._count._all,
      })),
    });
  } catch (err) {
    next(err);
  }
});
