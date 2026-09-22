import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import * as drawsService from "../services/draws";

export const drawsRouter = Router();
export const adminDrawsRouter = Router();

function winnerCounts(winners: { matchTier: string }[]) {
  return {
    FIVE: winners.filter((w) => w.matchTier === "FIVE").length,
    FOUR: winners.filter((w) => w.matchTier === "FOUR").length,
    THREE: winners.filter((w) => w.matchTier === "THREE").length,
  };
}

// ---------------------------------------------------------------------------
// Public — published draws only (RLS mirrors this at the DB level too).
// ---------------------------------------------------------------------------

drawsRouter.get("/", async (_req, res, next) => {
  try {
    const draws = await prisma.draw.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { winners: { select: { matchTier: true } } },
    });

    res.json({
      draws: draws.map((d) => ({
        id: d.id,
        periodLabel: d.periodLabel,
        method: d.method,
        publishedAt: d.publishedAt,
        winningNumbers: d.winningNumbers,
        prizePoolPaise: d.prizePoolPaise,
        tier5PoolPaise: d.tier5PoolPaise,
        tier4PoolPaise: d.tier4PoolPaise,
        tier3PoolPaise: d.tier3PoolPaise,
        jackpotRolloverOutPaise: d.jackpotRolloverOutPaise,
        eligibleSubscriberCount: d.eligibleSubscriberCount,
        winnerCounts: winnerCounts(d.winners),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/draws/mine — the caller's participation history. Mounted before
// "/:id" so "mine" isn't swallowed as an id param.
drawsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const tickets = await prisma.drawTicket.findMany({
      where: { userId: req.user!.id },
      include: {
        draw: { select: { id: true, periodLabel: true, publishedAt: true, winningNumbers: true } },
        winners: { select: { matchTier: true, prizeAmountPaise: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      participation: tickets.map((t) => ({
        drawId: t.draw.id,
        periodLabel: t.draw.periodLabel,
        publishedAt: t.draw.publishedAt,
        yourNumbers: t.numbers,
        winningNumbers: t.draw.winningNumbers,
        won: t.winners.length > 0 ? t.winners[0] : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

drawsRouter.get("/:id", async (req, res, next) => {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: req.params.id },
      include: { winners: { select: { matchTier: true } } },
    });
    if (!draw || draw.status !== "PUBLISHED") throw new ApiError(404, "Draw not found");

    res.json({
      draw: {
        id: draw.id,
        periodLabel: draw.periodLabel,
        method: draw.method,
        publishedAt: draw.publishedAt,
        winningNumbers: draw.winningNumbers,
        prizePoolPaise: draw.prizePoolPaise,
        tier5PoolPaise: draw.tier5PoolPaise,
        tier4PoolPaise: draw.tier4PoolPaise,
        tier3PoolPaise: draw.tier3PoolPaise,
        jackpotRolloverOutPaise: draw.jackpotRolloverOutPaise,
        eligibleSubscriberCount: draw.eligibleSubscriberCount,
        winnerCounts: winnerCounts(draw.winners),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Admin — draw configuration + full draw lifecycle management.
// ---------------------------------------------------------------------------

adminDrawsRouter.use(requireAuth, requireRole("ADMIN"));

adminDrawsRouter.get("/config", async (_req, res, next) => {
  try {
    const config = await drawsService.getActiveDrawConfig();
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

const configSchema = z
  .object({
    method: z.enum(["RANDOM", "ALGORITHMIC"]),
    tier5Pct: z.coerce.number().min(0).max(100),
    tier4Pct: z.coerce.number().min(0).max(100),
    tier3Pct: z.coerce.number().min(0).max(100),
    prizePoolPct: z.coerce.number().min(0).max(100),
  })
  .refine((v) => Math.abs(v.tier5Pct + v.tier4Pct + v.tier3Pct - 100) < 0.01, {
    message: "Tier percentages must add up to 100",
  });

// PUT /api/admin/draws/config — creates a new active config row and
// deactivates the previous one, preserving history instead of overwriting.
adminDrawsRouter.put("/config", async (req, res, next) => {
  try {
    const body = configSchema.parse(req.body);

    const config = await prisma.$transaction(async (tx) => {
      await tx.drawConfiguration.updateMany({ where: { isActive: true }, data: { isActive: false } });
      return tx.drawConfiguration.create({
        data: {
          method: body.method,
          tier5PoolPct: body.tier5Pct,
          tier4PoolPct: body.tier4Pct,
          tier3PoolPct: body.tier3Pct,
          prizePoolPctOfSub: body.prizePoolPct,
          isActive: true,
        },
      });
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "DRAW_CONFIG_UPDATED",
      entityType: "draw_configuration",
      entityId: config.id,
      metadata: body,
    });

    res.json({ config });
  } catch (err) {
    next(err);
  }
});

adminDrawsRouter.get("/", async (_req, res, next) => {
  try {
    const draws = await prisma.draw.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { winners: true, tickets: true, simulations: true } } },
    });
    res.json({ draws });
  } catch (err) {
    next(err);
  }
});

adminDrawsRouter.get("/:id", async (req, res, next) => {
  try {
    const draw = await prisma.draw.findUnique({
      where: { id: req.params.id },
      include: {
        simulations: { orderBy: { createdAt: "desc" } },
        winners: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            verification: true,
            payout: true,
          },
        },
        _count: { select: { tickets: true } },
      },
    });
    if (!draw) throw new ApiError(404, "Draw not found");
    res.json({ draw });
  } catch (err) {
    next(err);
  }
});

const createDrawSchema = z.object({
  periodLabel: z.string().regex(/^\d{4}-\d{2}$/, "Period label must be YYYY-MM"),
  method: z.enum(["RANDOM", "ALGORITHMIC"]).optional(),
});

adminDrawsRouter.post("/", async (req, res, next) => {
  try {
    const body = createDrawSchema.parse(req.body);
    const config = await drawsService.getActiveDrawConfig();
    const draw = await drawsService.createDraw({
      periodLabel: body.periodLabel,
      method: body.method ?? config.method,
      actorId: req.user!.id,
    });
    res.status(201).json({ draw });
  } catch (err) {
    next(err);
  }
});

const seedSchema = z.object({ seed: z.string().min(1).max(200).optional() });

adminDrawsRouter.post("/:id/simulate", async (req, res, next) => {
  try {
    const { seed } = seedSchema.parse(req.body ?? {});
    const simulation = await drawsService.simulateDraw(req.params.id, req.user!.id, seed);
    res.status(201).json({ simulation });
  } catch (err) {
    next(err);
  }
});

adminDrawsRouter.post("/:id/publish", async (req, res, next) => {
  try {
    const { seed } = seedSchema.parse(req.body ?? {});
    const draw = await drawsService.publishDraw(req.params.id, req.user!.id, seed);
    res.json({ draw });
  } catch (err) {
    next(err);
  }
});
