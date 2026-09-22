import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { recordAudit } from "../lib/audit";
import { ApiError } from "../middleware/errorHandler";

export const donationsRouter = Router();

const donateSchema = z.object({
  charityId: z.string().uuid(),
  amountPaise: z.number().int().positive().max(10_000_000), // ₹1 lakh sanity ceiling
});

// POST /api/donations
// An independent, one-off contribution — not tied to subscription gameplay
// (PRD §08.1). This build records the pledge directly rather than routing it
// through the PaymentProvider abstraction (checkout/webhook round trip);
// wiring that up is a natural follow-on once a real gateway is live, using
// the exact same PaymentProvider interface the subscription flow already
// uses. Documented simplification, not a gap in the data model.
donationsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { charityId, amountPaise } = donateSchema.parse(req.body);

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (!charity || !charity.isActive) {
      throw new ApiError(400, "Selected charity is not available");
    }

    const donation = await prisma.donation.create({
      data: { userId: req.user!.id, charityId, amountPaise },
    });

    await recordAudit({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "DONATION_MADE",
      entityType: "donation",
      entityId: donation.id,
      metadata: { charityId, amountPaise },
    });

    res.status(201).json({ donation });
  } catch (err) {
    next(err);
  }
});

// GET /api/donations — the caller's own donation history.
donationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { charity: { select: { id: true, name: true, slug: true } } },
    });
    res.json({ donations });
  } catch (err) {
    next(err);
  }
});
