import { JwksClient } from "jwks-rsa";
import { env } from "./env";

// Newer Supabase projects sign auth JWTs with an asymmetric key (ES256/RS256)
// rather than the legacy shared HS256 secret — SUPABASE_JWT_SECRET only
// applies to older (HS256) projects. This client fetches the current public
// signing key from Supabase's JWKS endpoint, matched by the token's `kid`.
export const jwksClient = new JwksClient({
  jwksUri: `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
});

export function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error("Signing key not found"));
      resolve(key.getPublicKey());
    });
  });
}
