import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { validateProofFile, MAX_PROOF_FILE_BYTES } from "../lib/fileValidation";
import { getSignedProofUrl, uploadProofFile } from "../lib/storage";
import { canMarkPaid, canReview, canSubmitProof } from "../lib/verificationTransitions";

export const winnersRouter = Router();
export const adminWinnersRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PROOF_FILE_BYTES } });

const winnerInclude = {
  draw: { select: { id: true, periodLabel: true, publishedAt: true } },
  verification: true,
  payout: true,
} as const;

// ---------------------------------------------------------------------------
// Subscriber-facing
// ---------------------------------------------------------------------------

winnersRouter.use(requireAuth);

// GET /api/winners — the caller's own winnings, most recent first.
winnersRouter.get("/", async (req, res, next) => {
  try {
    const winners = await prisma.drawWinner.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: winnerInclude,
    });
    const totalWonPaise = winners.reduce((sum, w) => sum + w.prizeAmountPaise, 0);
    const totalPaidPaise = winners
      .filter((w) => w.payout?.status === "PAID")
      .reduce((sum, w) => sum + w.prizeAmountPaise, 0);

    res.json({ winners, totalWonPaise, totalPaidPaise });
  } catch (err) {
    next(err);
  }
});

// POST /api/winners/:id/proof — upload/re-upload a proof screenshot.
winnersRouter.post("/:id/proof", upload.single("file"), async (req, res, next) => {
  try {
    const drawWinner = await prisma.drawWinner.findUnique({
      where: { id: req.params.id },
      include: { verification: true },
    });
    if (!drawWinner || drawWinner.userId !== req.user!.id) {
      throw new ApiError(404, "Winner record not found");
    }
    if (!drawWinner.verification) throw new ApiError(500, "Verification record missing for this winner");
    if (!canSubmitProof(drawWinner.verification.status)) {
      throw new ApiError(409, `Cannot submit proof while status is ${drawWinner.verification.status}`);
    }
    if (!req.file) throw new ApiError(400, "No file uploaded — attach a screenshot as 'file'.");

    const check = validateProofFile({ mimetype: req.file.mimetype, size: req.file.size });
    if (!check.ok) throw new ApiError(400, check.error);

    const ext = req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
    const path = `${drawWinner.id}/${Date.now()}.${ext}`;
    await uploadProofFile(path, req.file.buffer, req.file.mimetype);

    const verification = await prisma.winnerVerification.update({
      where: { drawWinnerId: drawWinner.id },
      data: {
        status: "SUBMITTED",
        proofFilePath: path,
        reviewNotes: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "WINNER_PROOF_SUBMITTED",
      entityType: "winner_verification",
      entityId: verification.id,
      metadata: { drawWinnerId: drawWinner.id, path },
    });

    res.status(201).json({ verification });
  } catch (err) {
    next(err);
  }
});

async function signedProofUrlFor(req: import("express").Request, drawWinnerId: string) {
  const drawWinner = await prisma.drawWinner.findUnique({
    where: { id: drawWinnerId },
    include: { verification: true },
  });
  if (!drawWinner) throw new ApiError(404, "Winner record not found");
  const isOwner = drawWinner.userId === req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";
  if (!isOwner && !isAdmin) throw new ApiError(404, "Winner record not found");
  if (!drawWinner.verification?.proofFilePath) throw new ApiError(404, "No proof has been uploaded yet");

  return getSignedProofUrl(drawWinner.verification.proofFilePath);
}

// GET /api/winners/:id/proof — short-lived signed URL to view the proof (owner or admin only).
winnersRouter.get("/:id/proof", async (req, res, next) => {
  try {
    const url = await signedProofUrlFor(req, req.params.id);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Admin — review queue, approve/reject, payout tracking.
// ---------------------------------------------------------------------------

adminWinnersRouter.use(requireAuth, requireRole("ADMIN"));

const listQuerySchema = z.object({
  status: z.enum(["AWAITING_PROOF", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
});

adminWinnersRouter.get("/", async (req, res, next) => {
  try {
    const { status } = listQuerySchema.parse(req.query);
    const winners = await prisma.drawWinner.findMany({
      where: status ? { verification: { status } } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        ...winnerInclude,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    res.json({ winners });
  } catch (err) {
    next(err);
  }
});

adminWinnersRouter.get("/:id", async (req, res, next) => {
  try {
    const winner = await prisma.drawWinner.findUnique({
      where: { id: req.params.id },
      include: {
        ...winnerInclude,
        user: { select: { id: true, email: true, fullName: true } },
        ticket: true,
      },
    });
    if (!winner) throw new ApiError(404, "Winner record not found");
    res.json({ winner });
  } catch (err) {
    next(err);
  }
});

adminWinnersRouter.get("/:id/proof", async (req, res, next) => {
  try {
    const url = await signedProofUrlFor(req, req.params.id);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({ notes: z.string().max(2000).optional() });

adminWinnersRouter.post("/:id/verify", async (req, res, next) => {
  try {
    const { notes } = reviewSchema.parse(req.body ?? {});
    const drawWinner = await prisma.drawWinner.findUnique({
      where: { id: req.params.id },
      include: { verification: true },
    });
    if (!drawWinner?.verification) throw new ApiError(404, "Winner record not found");
    if (!canReview(drawWinner.verification.status)) {
      throw new ApiError(409, `Cannot approve from status ${drawWinner.verification.status} — proof must be submitted first`);
    }

    const verification = await prisma.winnerVerification.update({
      where: { drawWinnerId: drawWinner.id },
      data: { status: "APPROVED", reviewNotes: notes ?? null, reviewedById: req.user!.id, reviewedAt: new Date() },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "WINNER_APPROVED",
      entityType: "winner_verification",
      entityId: verification.id,
      metadata: { drawWinnerId: drawWinner.id, notes },
    });

    res.json({ verification });
  } catch (err) {
    next(err);
  }
});

const rejectSchema = z.object({ notes: z.string().min(1, "A reason is required when rejecting proof").max(2000) });

adminWinnersRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const { notes } = rejectSchema.parse(req.body ?? {});
    const drawWinner = await prisma.drawWinner.findUnique({
      where: { id: req.params.id },
      include: { verification: true },
    });
    if (!drawWinner?.verification) throw new ApiError(404, "Winner record not found");
    if (!canReview(drawWinner.verification.status)) {
      throw new ApiError(409, `Cannot reject from status ${drawWinner.verification.status} — proof must be submitted first`);
    }

    const verification = await prisma.winnerVerification.update({
      where: { drawWinnerId: drawWinner.id },
      data: { status: "REJECTED", reviewNotes: notes, reviewedById: req.user!.id, reviewedAt: new Date() },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "WINNER_REJECTED",
      entityType: "winner_verification",
      entityId: verification.id,
      metadata: { drawWinnerId: drawWinner.id, notes },
    });

    res.json({ verification });
  } catch (err) {
    next(err);
  }
});

adminWinnersRouter.post("/:id/payout", async (req, res, next) => {
  try {
    const drawWinner = await prisma.drawWinner.findUnique({
      where: { id: req.params.id },
      include: { verification: true, payout: true },
    });
    if (!drawWinner?.verification || !drawWinner.payout) throw new ApiError(404, "Winner record not found");
    if (!canMarkPaid(drawWinner.verification.status, drawWinner.payout.status)) {
      throw new ApiError(
        409,
        drawWinner.payout.status === "PAID"
          ? "This payout has already been marked paid"
          : "Winner must be approved before payout"
      );
    }

    const payout = await prisma.payout.update({
      where: { drawWinnerId: drawWinner.id },
      data: { status: "PAID", paidById: req.user!.id, paidAt: new Date() },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "PAYOUT_COMPLETED",
      entityType: "payout",
      entityId: payout.id,
      metadata: { drawWinnerId: drawWinner.id, amountPaise: payout.amountPaise },
    });

    res.json({ payout });
  } catch (err) {
    next(err);
  }
});
