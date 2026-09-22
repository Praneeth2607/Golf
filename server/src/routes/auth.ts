import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { recordAudit } from "../lib/audit";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1).max(120),
});

// POST /api/auth/register
// Creates the Supabase auth user (profile row is created by the DB trigger).
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName },
    });

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message ?? "Registration failed" });
    }

    await recordAudit({
      actorId: data.user.id,
      action: "USER_REGISTERED",
      entityType: "profile",
      entityId: data.user.id,
    });

    res.status(201).json({ userId: data.user.id, email: data.user.email });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
// Frontend logs in directly against Supabase Auth (see client/src/lib/supabase.ts)
// and calls this endpoint with the resulting access token to fetch the
// authoritative profile/role — the frontend never decides its own role.
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});
