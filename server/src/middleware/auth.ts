import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { getSigningKey } from "../lib/jwks";
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
 *
 * Supabase projects sign auth tokens one of two ways depending on when the
 * project was created: legacy projects use a shared HS256 secret
 * (SUPABASE_JWT_SECRET); newer projects sign with an asymmetric key
 * (ES256/RS256), verified here against Supabase's published JWKS. We check
 * the token's own header to know which path applies — trying both blindly
 * would let an attacker pick the weaker one.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);

  let payload: SupabaseJwtPayload;
  try {
    const decoded = jwt.decode(token, { complete: true });
    const alg = decoded?.header.alg;

    if (alg === "HS256") {
      if (!env.SUPABASE_JWT_SECRET) throw new Error("SUPABASE_JWT_SECRET is not configured");
      payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, { algorithms: ["HS256"] }) as SupabaseJwtPayload;
    } else if (alg === "ES256" || alg === "RS256") {
      const kid = decoded?.header.kid;
      if (!kid) throw new Error("Token is missing a key id (kid)");
      const publicKey = await getSigningKey(kid);
      payload = jwt.verify(token, publicKey, { algorithms: [alg] }) as SupabaseJwtPayload;
    } else {
      throw new Error(`Unsupported token algorithm: ${alg}`);
    }
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
