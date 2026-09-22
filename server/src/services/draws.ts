import crypto from "crypto";
import { Prisma, DrawMethod, MatchTier } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { recordAudit } from "../lib/audit";
import { ApiError } from "../middleware/errorHandler";
import { deriveTicketNumbers } from "../draw/tickets";
import { generateAlgorithmicDraw, generateRandomDraw } from "../draw/numberGeneration";
import { calculateMatches } from "../draw/matching";
import { applyJackpotRollover, calculatePrizePool, calculatePrizeTiers } from "../draw/prizePool";
import { splitEqually } from "../lib/money";

interface EligibleSubscriber {
  userId: string;
  amountPaise: number;
  ticketNumbers: number[];
}

/**
 * ACTIVE subscription + at least one logged score. A user with zero scores
 * has nothing to form a ticket from and is excluded entirely, rather than
 * given an empty/invalid ticket.
 */
export async function calculateEligibleSubscribers(): Promise<EligibleSubscriber[]> {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { userId: true, amountPaise: true },
  });
  if (activeSubs.length === 0) return [];

  const scores = await prisma.score.findMany({
    where: { userId: { in: activeSubs.map((s) => s.userId) } },
    orderBy: { playedOn: "desc" },
    select: { userId: true, strokes: true },
  });

  const scoresByUser = new Map<string, number[]>();
  for (const s of scores) {
    const arr = scoresByUser.get(s.userId) ?? [];
    arr.push(s.strokes);
    scoresByUser.set(s.userId, arr);
  }

  return activeSubs
    .map((sub) => ({
      userId: sub.userId,
      amountPaise: sub.amountPaise,
      ticketNumbers: deriveTicketNumbers((scoresByUser.get(sub.userId) ?? []).map((strokes) => ({ strokes }))),
    }))
    .filter((s) => s.ticketNumbers.length > 0);
}

export async function getActiveDrawConfig() {
  const config = await prisma.drawConfiguration.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    config ?? {
      method: "RANDOM" as DrawMethod,
      tier5PoolPct: new Prisma.Decimal(40),
      tier4PoolPct: new Prisma.Decimal(35),
      tier3PoolPct: new Prisma.Decimal(25),
      prizePoolPctOfSub: new Prisma.Decimal(20),
    }
  );
}

function generateWinningNumbers(method: DrawMethod, seed: string, eligible: EligibleSubscriber[]): number[] {
  return method === "ALGORITHMIC"
    ? generateAlgorithmicDraw(seed, eligible.map((e) => e.ticketNumbers))
    : generateRandomDraw(seed);
}

interface Allocation {
  userId: string;
  ticketNumbers: number[];
  matchTier: MatchTier;
}

function allocateMatches(eligible: EligibleSubscriber[], winningNumbers: number[]): Allocation[] {
  const allocations: Allocation[] = [];
  for (const e of eligible) {
    const tier = calculateMatches(e.ticketNumbers, winningNumbers);
    if (tier) allocations.push({ userId: e.userId, ticketNumbers: e.ticketNumbers, matchTier: tier });
  }
  return allocations;
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export async function createDraw(params: { periodLabel: string; method: DrawMethod; actorId: string }) {
  const existing = await prisma.draw.findUnique({ where: { periodLabel: params.periodLabel } });
  if (existing) throw new ApiError(409, `A draw for ${params.periodLabel} already exists`);

  // An unclaimed jackpot from the most recently published draw carries
  // forward into the next one created — see README "Jackpot rollover".
  const lastPublished = await prisma.draw.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: { jackpotRolloverOutPaise: true },
  });

  const draw = await prisma.draw.create({
    data: {
      periodLabel: params.periodLabel,
      method: params.method,
      status: "DRAFT",
      jackpotRolloverInPaise: lastPublished?.jackpotRolloverOutPaise ?? 0,
    },
  });

  await recordAudit({
    actorId: params.actorId,
    actorRole: "ADMIN",
    action: "DRAW_CREATED",
    entityType: "draw",
    entityId: draw.id,
    metadata: { periodLabel: params.periodLabel, method: params.method },
  });

  return draw;
}

/**
 * Preview only — never touches Draw status, DrawTicket, DrawWinner, or
 * Payout. Writes solely to DrawSimulation. Uses a fresh random seed each
 * run unless one is supplied, so re-simulating gives a new preview.
 */
export async function simulateDraw(drawId: string, actorId: string, seedOverride?: string) {
  const draw = await prisma.draw.findUnique({ where: { id: drawId } });
  if (!draw) throw new ApiError(404, "Draw not found");
  if (draw.status === "PUBLISHED") throw new ApiError(409, "This draw is already published");

  const config = await getActiveDrawConfig();
  const eligible = await calculateEligibleSubscribers();
  const seed = seedOverride ?? `${draw.id}:sim:${crypto.randomUUID()}`;
  const winningNumbers = generateWinningNumbers(draw.method, seed, eligible);

  const prizePoolPaise = calculatePrizePool(
    eligible.map((e) => e.amountPaise),
    config.prizePoolPctOfSub.toString()
  );
  const tiers = calculatePrizeTiers(
    prizePoolPaise,
    { tier5Pct: config.tier5PoolPct.toString(), tier4Pct: config.tier4PoolPct.toString(), tier3Pct: config.tier3PoolPct.toString() },
    draw.jackpotRolloverInPaise
  );

  const allocations = allocateMatches(eligible, winningNumbers);
  const byTier = {
    FIVE: allocations.filter((a) => a.matchTier === "FIVE"),
    FOUR: allocations.filter((a) => a.matchTier === "FOUR"),
    THREE: allocations.filter((a) => a.matchTier === "THREE"),
  };
  const jackpot = applyJackpotRollover(tiers.tier5, byTier.FIVE.length > 0);

  const resultSummary = {
    eligibleSubscriberCount: eligible.length,
    prizePoolPaise,
    tiers,
    winnerCounts: { FIVE: byTier.FIVE.length, FOUR: byTier.FOUR.length, THREE: byTier.THREE.length },
    prizePerWinner: {
      FIVE: byTier.FIVE.length ? splitEqually(jackpot.distributedPaise, byTier.FIVE.length)[0] : 0,
      FOUR: byTier.FOUR.length ? splitEqually(tiers.tier4, byTier.FOUR.length)[0] : 0,
      THREE: byTier.THREE.length ? splitEqually(tiers.tier3, byTier.THREE.length)[0] : 0,
    },
    jackpotRolloverOutPaise: jackpot.rolloverOutPaise,
  };

  const simulation = await prisma.drawSimulation.create({
    data: { drawId, runById: actorId, seed, winningNumbers, resultSummary: resultSummary as never },
  });

  if (draw.status === "DRAFT") {
    await prisma.draw.update({ where: { id: drawId }, data: { status: "SIMULATED" } });
  }

  await recordAudit({
    actorId,
    actorRole: "ADMIN",
    action: "DRAW_SIMULATED",
    entityType: "draw",
    entityId: drawId,
    metadata: { simulationId: simulation.id, seed },
  });

  return simulation;
}

/**
 * Computes the real result fresh (independent of any prior simulation —
 * simulations are non-authoritative previews) and commits it atomically:
 * tickets, winners, verifications, and payouts are all created in the same
 * transaction as flipping the draw to PUBLISHED. A Postgres trigger
 * additionally blocks any further mutation of a published draw row, so
 * this function is the only path that can ever produce a result — nothing
 * downstream can quietly edit one afterward.
 */
export async function publishDraw(drawId: string, actorId: string, seedOverride?: string) {
  const draw = await prisma.draw.findUnique({ where: { id: drawId } });
  if (!draw) throw new ApiError(404, "Draw not found");
  if (draw.status === "PUBLISHED") throw new ApiError(409, "This draw is already published");

  const config = await getActiveDrawConfig();
  const eligible = await calculateEligibleSubscribers();
  const seed = seedOverride ?? `${draw.id}:publish:${crypto.randomUUID()}`;
  const winningNumbers = generateWinningNumbers(draw.method, seed, eligible);

  const prizePoolPaise = calculatePrizePool(
    eligible.map((e) => e.amountPaise),
    config.prizePoolPctOfSub.toString()
  );
  const tiers = calculatePrizeTiers(
    prizePoolPaise,
    { tier5Pct: config.tier5PoolPct.toString(), tier4Pct: config.tier4PoolPct.toString(), tier3Pct: config.tier3PoolPct.toString() },
    draw.jackpotRolloverInPaise
  );

  const allocations = allocateMatches(eligible, winningNumbers);
  const byTier = {
    FIVE: allocations.filter((a) => a.matchTier === "FIVE"),
    FOUR: allocations.filter((a) => a.matchTier === "FOUR"),
    THREE: allocations.filter((a) => a.matchTier === "THREE"),
  };
  const jackpot = applyJackpotRollover(tiers.tier5, byTier.FIVE.length > 0);

  const prizesByTier: Record<MatchTier, number[]> = {
    FIVE: splitEqually(jackpot.distributedPaise, byTier.FIVE.length),
    FOUR: splitEqually(tiers.tier4, byTier.FOUR.length),
    THREE: splitEqually(tiers.tier3, byTier.THREE.length),
  };

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction in case of a concurrent publish.
    const fresh = await tx.draw.findUniqueOrThrow({ where: { id: drawId } });
    if (fresh.status === "PUBLISHED") throw new ApiError(409, "This draw is already published");

    if (eligible.length > 0) {
      await tx.drawTicket.createMany({
        data: eligible.map((e) => ({ drawId, userId: e.userId, numbers: e.ticketNumbers })),
      });
    }
    const tickets = await tx.drawTicket.findMany({ where: { drawId } });
    const ticketByUser = new Map(tickets.map((t) => [t.userId, t.id]));

    for (const tier of ["FIVE", "FOUR", "THREE"] as MatchTier[]) {
      const winnersInTier = byTier[tier];
      const prizes = prizesByTier[tier];
      for (let i = 0; i < winnersInTier.length; i++) {
        const w = winnersInTier[i];
        const ticketId = ticketByUser.get(w.userId);
        if (!ticketId) continue; // shouldn't happen — every eligible user gets a ticket above

        const drawWinner = await tx.drawWinner.create({
          data: { drawId, userId: w.userId, ticketId, matchTier: tier, prizeAmountPaise: prizes[i] },
        });
        await tx.winnerVerification.create({ data: { drawWinnerId: drawWinner.id, status: "AWAITING_PROOF" } });
        await tx.payout.create({ data: { drawWinnerId: drawWinner.id, status: "PENDING", amountPaise: prizes[i] } });
      }
    }

    await tx.draw.update({
      where: { id: drawId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: actorId,
        winningNumbers,
        seed,
        eligibleSubscriberCount: eligible.length,
        prizePoolPaise,
        tier5PoolPaise: tiers.tier5,
        tier4PoolPaise: tiers.tier4,
        tier3PoolPaise: tiers.tier3,
        jackpotRolloverOutPaise: jackpot.rolloverOutPaise,
      },
    });
  });

  await recordAudit({
    actorId,
    actorRole: "ADMIN",
    action: "DRAW_PUBLISHED",
    entityType: "draw",
    entityId: drawId,
    metadata: {
      seed,
      eligibleSubscriberCount: eligible.length,
      winnerCounts: { FIVE: byTier.FIVE.length, FOUR: byTier.FOUR.length, THREE: byTier.THREE.length },
    },
  });

  return prisma.draw.findUnique({
    where: { id: drawId },
    include: { winners: { include: { user: { select: { id: true, fullName: true, email: true } } } } },
  });
}
