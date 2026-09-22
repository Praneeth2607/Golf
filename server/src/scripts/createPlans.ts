import "dotenv/config";
import Razorpay from "razorpay";

// One-off setup script: creates the Monthly / Yearly subscription Plans in
// your Razorpay account and prints their IDs to paste into .env as
// RAZORPAY_PLAN_ID_MONTHLY / RAZORPAY_PLAN_ID_YEARLY. Safe to re-run — it
// just creates new plans each time (Razorpay has no upsert-by-name), so only
// run it once per environment.
//
// Pricing (documented assumption — the PRD doesn't set a price): ₹499/month,
// ₹4,999/year (≈17% cheaper than 12 months paid monthly).

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret || keyId.includes("...")) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env first.");
  process.exit(1);
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function main() {
  const monthly = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "Digital Heroes — Monthly",
      amount: 49900, // paise
      currency: "INR",
      description: "Monthly subscription: score tracking, monthly draw entry, charity contribution.",
    },
  });

  const yearly = await razorpay.plans.create({
    period: "yearly",
    interval: 1,
    item: {
      name: "Digital Heroes — Yearly",
      amount: 499900, // paise
      currency: "INR",
      description: "Yearly subscription (discounted): score tracking, monthly draw entry, charity contribution.",
    },
  });

  console.log("\nAdd these to server/.env:\n");
  console.log(`RAZORPAY_PLAN_ID_MONTHLY="${monthly.id}"`);
  console.log(`RAZORPAY_PLAN_ID_YEARLY="${yearly.id}"`);
}

main().catch((err) => {
  console.error("Failed to create plans:", err?.error ?? err);
  process.exit(1);
});
