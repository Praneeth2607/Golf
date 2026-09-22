import { prisma } from "../lib/prisma";
import { idsToEvict } from "../lib/scoreWindow";
import { ApiError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { Role } from "@prisma/client";

const MAX_SCORES = 5;

export async function listScores(userId: string) {
  return prisma.score.findMany({
    where: { userId },
    orderBy: { playedOn: "desc" },
  });
}

interface Actor {
  id: string;
  role: Role;
}

/**
 * Adds a score, then enforces the rolling window of MAX_SCORES most recent
 * (by played date) — see src/lib/scoreWindow.ts for the eviction rule itself.
 * Runs as an interactive transaction so the insert-then-evict is atomic
 * under concurrent requests.
 */
export async function addScore(
  userId: string,
  input: { strokes: number; playedOn: Date },
  actor: Actor
) {
  const created = await prisma.$transaction(async (tx) => {
    const score = await tx.score
      .create({ data: { userId, strokes: input.strokes, playedOn: input.playedOn } })
      .catch((err) => {
        if (err?.code === "P2002") {
          throw new ApiError(409, "A score for this date already exists — edit it instead.");
        }
        throw err;
      });

    const all = await tx.score.findMany({ where: { userId }, select: { id: true, playedOn: true } });
    const evictIds = idsToEvict(all, MAX_SCORES);
    if (evictIds.length > 0) {
      await tx.score.deleteMany({ where: { id: { in: evictIds } } });
    }

    return { score, evictedCount: evictIds.length };
  });

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "SCORE_ADDED",
    entityType: "score",
    entityId: created.score.id,
    metadata: { userId, strokes: input.strokes, playedOn: input.playedOn, evictedCount: created.evictedCount },
  });

  return listScores(userId);
}

async function getOwnedScore(scoreId: string, userId: string | null) {
  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score) throw new ApiError(404, "Score not found");
  if (userId && score.userId !== userId) throw new ApiError(404, "Score not found");
  return score;
}

export async function updateScore(
  scoreId: string,
  ownerUserId: string | null, // null = admin, bypasses ownership check
  input: { strokes?: number; playedOn?: Date },
  actor: Actor
) {
  const existing = await getOwnedScore(scoreId, ownerUserId);

  const updated = await prisma.score
    .update({
      where: { id: scoreId },
      data: {
        ...(input.strokes !== undefined ? { strokes: input.strokes } : {}),
        ...(input.playedOn !== undefined ? { playedOn: input.playedOn } : {}),
      },
    })
    .catch((err) => {
      if (err?.code === "P2002") {
        throw new ApiError(409, "A score for this date already exists.");
      }
      throw err;
    });

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: actor.id === existing.userId ? "SCORE_UPDATED" : "SCORE_UPDATED_BY_ADMIN",
    entityType: "score",
    entityId: scoreId,
    metadata: { before: { strokes: existing.strokes, playedOn: existing.playedOn }, after: input },
  });

  return updated;
}

export async function deleteScore(scoreId: string, ownerUserId: string | null, actor: Actor) {
  const existing = await getOwnedScore(scoreId, ownerUserId);

  await prisma.score.delete({ where: { id: scoreId } });

  await recordAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: actor.id === existing.userId ? "SCORE_DELETED" : "SCORE_DELETED_BY_ADMIN",
    entityType: "score",
    entityId: scoreId,
    metadata: { userId: existing.userId, strokes: existing.strokes, playedOn: existing.playedOn },
  });
}
