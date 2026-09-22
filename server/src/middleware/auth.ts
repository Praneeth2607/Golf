import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

export interface AuthedUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
}

/**
 * Verifies the Supabase-issued JWT and loads the user's role from our own
 * `profiles` table (never trusted from the token/client) on every request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);

  let payload: SupabaseJwtPayload;
  try {
    payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ["HS256"],
    }) as SupabaseJwtPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
  if (!profile) {
    return res.status(401).json({ error: "No profile found for this account" });
  }

  req.user = { id: profile.id, email: profile.email, role: profile.role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
