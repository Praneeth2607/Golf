import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { requireActiveSubscription } from "../middleware/subscription";
import { ApiError } from "../middleware/errorHandler";
import { stablefordScoreSchema } from "../lib/validation";
import * as scoresService from "../services/scores";

export const scoresRouter = Router();
export const adminScoresRouter = Router();

const scoreInputSchema = z.object({
  strokes: z.coerce.number().pipe(stablefordScoreSchema),
  playedOn: z.coerce.date(),
});

function assertNotFuture(date: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow any time today, reject strictly future calendar dates
  if (date.getTime() > today.getTime()) {
    throw new ApiError(400, "Score date cannot be in the future");
  }
}

// ---------------------------------------------------------------------------
// Subscriber-facing — requires an active subscription, matching the rest of
// the app's gated actions (PRD §04: real-time subscription check).
// ---------------------------------------------------------------------------

scoresRouter.use(requireAuth, requireActiveSubscription);

// GET /api/scores — the caller's own scores, most recent first.
scoresRouter.get("/", async (req, res, next) => {
  try {
    const scores = await scoresService.listScores(req.user!.id);
    res.json({ scores });
  } catch (err) {
    next(err);
  }
});

// POST /api/scores — add a score; enforces the rolling 5-score window.
scoresRouter.post("/", async (req, res, next) => {
  try {
    const { strokes, playedOn } = scoreInputSchema.parse(req.body);
    assertNotFuture(playedOn);

    const scores = await scoresService.addScore(req.user!.id, { strokes, playedOn }, req.user!);
    res.status(201).json({ scores });
  } catch (err) {
    next(err);
  }
});

const scoreUpdateSchema = scoreInputSchema.partial();

// PUT /api/scores/:id — edit one of the caller's own scores.
scoresRouter.put("/:id", async (req, res, next) => {
  try {
    const body = scoreUpdateSchema.parse(req.body);
    if (body.playedOn) assertNotFuture(body.playedOn);

    const score = await scoresService.updateScore(req.params.id, req.user!.id, body, req.user!);
    res.json({ score });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/scores/:id
scoresRouter.delete("/:id", async (req, res, next) => {
  try {
    await scoresService.deleteScore(req.params.id, req.user!.id, req.user!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Admin — view/edit any user's scores. No subscription requirement (an
// admin isn't necessarily a subscriber). Looked up by email since full user
// management (search/list) is Milestone 9; this is enough for the admin
// score-editing tool the PRD calls for in the meantime.
// ---------------------------------------------------------------------------

adminScoresRouter.use(requireAuth, requireRole("ADMIN"));

const emailQuerySchema = z.object({ email: z.string().email() });

adminScoresRouter.get("/", async (req, res, next) => {
  try {
    const { email } = emailQuerySchema.parse(req.query);
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) throw new ApiError(404, "No user with that email");

    const scores = await scoresService.listScores(profile.id);
    res.json({ user: { id: profile.id, email: profile.email, fullName: profile.fullName }, scores });
  } catch (err) {
    next(err);
  }
});

adminScoresRouter.put("/:id", async (req, res, next) => {
  try {
    const body = scoreUpdateSchema.parse(req.body);
    if (body.playedOn) assertNotFuture(body.playedOn);

    const score = await scoresService.updateScore(req.params.id, null, body, req.user!);
    res.json({ score });
  } catch (err) {
    next(err);
  }
});

adminScoresRouter.delete("/:id", async (req, res, next) => {
  try {
    await scoresService.deleteScore(req.params.id, null, req.user!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
