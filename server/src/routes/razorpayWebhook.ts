import { Router } from "express";
import express from "express";
import { paymentProvider } from "../lib/payments";
import { applySubscriptionEvent } from "../services/subscriptionEvents";

export const razorpayWebhookRouter = Router();

// Mounted before the global express.json() parser in index.ts, so we apply
// express.raw() here — Razorpay's HMAC signature is computed over the exact
// raw request bytes and breaks if the body has already been parsed/re-serialized.
razorpayWebhookRouter.post("/", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    if (paymentProvider.name !== "razorpay") {
      return res.status(404).json({ error: "Razorpay is not the active payment provider" });
    }

    const rawBody = req.body as Buffer;
    const signature = req.headers["x-razorpay-signature"];

    if (!paymentProvider.verifyWebhookSignature(rawBody, typeof signature === "string" ? signature : undefined)) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = paymentProvider.parseWebhookEvent(rawBody);
    if (!event) {
      // Not an event we track — 200 so Razorpay stops retrying it.
      return res.json({ received: true, ignored: true });
    }

    const result = await applySubscriptionEvent(event);
    res.json({ received: true, outcome: result.outcome });
  } catch (err) {
    next(err);
  }
});
