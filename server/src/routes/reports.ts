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

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Last `months` calendar months as "YYYY-MM" keys, oldest first, always present even at 0. */
function trailingMonthKeys(months: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

// GET /api/admin/reports/trends — Milestone 10: time-series and funnel views
// beyond the static totals above. Kept as a separate endpoint from GET / so
// the (cheaper, more-often-polled) top-line totals don't pay for this.
reportsRouter.get("/trends", async (_req, res, next) => {
  try {
    const [subscriptions, draws, verifications, payouts] = await Promise.all([
      prisma.subscription.findMany({ select: { createdAt: true } }),
      prisma.draw.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "asc" },
        select: {
          periodLabel: true,
          prizePoolPaise: true,
          eligibleSubscriberCount: true,
          jackpotRolloverOutPaise: true,
          _count: { select: { winners: true } },
        },
      }),
      prisma.winnerVerification.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.payout.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountPaise: true } }),
    ]);

    const months = trailingMonthKeys(6);
    const monthCounts = new Map(months.map((m) => [m, 0]));
    for (const s of subscriptions) {
      const key = monthKey(s.createdAt);
      if (monthCounts.has(key)) monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }

    res.json({
      subscriptionsByMonth: months.map((m) => ({ month: m, count: monthCounts.get(m) ?? 0 })),
      drawHistory: draws.map((d) => ({
        periodLabel: d.periodLabel,
        prizePoolPaise: d.prizePoolPaise ?? 0,
        eligibleSubscriberCount: d.eligibleSubscriberCount ?? 0,
        winnerCount: d._count.winners,
        jackpotRolledOver: (d.jackpotRolloverOutPaise ?? 0) > 0,
      })),
      verificationFunnel: Object.fromEntries(
        ["AWAITING_PROOF", "SUBMITTED", "APPROVED", "REJECTED"].map((status) => [
          status,
          verifications.find((v) => v.status === status)?._count._all ?? 0,
        ])
      ),
      payouts: {
        pending: { count: payouts.find((p) => p.status === "PENDING")?._count._all ?? 0, amountPaise: payouts.find((p) => p.status === "PENDING")?._sum.amountPaise ?? 0 },
        paid: { count: payouts.find((p) => p.status === "PAID")?._count._all ?? 0, amountPaise: payouts.find((p) => p.status === "PAID")?._sum.amountPaise ?? 0 },
      },
    });
  } catch (err) {
    next(err);
  }
});
