import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * Verifies the caller has an ACTIVE subscription, checked fresh against the
 * database on every call (PRD §04: "real-time subscription status check on
 * every authenticated request") — never inferred from a cached client claim.
 * Admins bypass this check.
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.user.role === "ADMIN") {
    return next();
  }

  const active = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: "ACTIVE" },
  });

  if (!active) {
    return res.status(403).json({ error: "An active subscription is required for this action" });
  }

  next();
}
