import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  // Only used for legacy (HS256) Supabase projects — newer projects sign
  // with an asymmetric key and are verified via JWKS instead (see
  // src/lib/jwks.ts and src/middleware/auth.ts), so this can stay unset.
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("winner-proofs"),
  // Public bucket — charity logos/covers are shown on public pages, unlike
  // winner proof, so they don't need signed URLs.
  SUPABASE_CHARITY_MEDIA_BUCKET: z.string().default("charity-media"),

  // "mock" needs no external account at all — it simulates the gateway
  // in-process so the full subscription lifecycle can be built/demoed
  // without Razorpay's business-KYC gate. Switch to "razorpay" once real
  // credentials are available; no other code changes needed (see
  // src/lib/payments/index.ts).
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),

  // Only required when PAYMENT_PROVIDER=razorpay (validated in
  // razorpayProvider.ts, not here, so mock mode works with none of these set).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ID_YEARLY: z.string().optional(),

  CHARITY_MIN_PERCENTAGE: z.coerce.number().default(10),
  PRIZE_POOL_PCT_OF_SUBSCRIPTION: z.coerce.number().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud rather than limping along with undefined secrets.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration — see stderr for details");
}

export const env = parsed.data;
