import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { subscriptionsRouter } from "./routes/subscriptions";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { razorpayWebhookRouter } from "./routes/razorpayWebhook";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Razorpay webhooks need the raw body for signature verification, so this is
// mounted before the global express.json() body parser.
app.use("/api/webhooks/razorpay", razorpayWebhookRouter);

app.use(express.json());

const generalLimiter = rateLimit({ windowMs: 60_000, limit: 120 });
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20 });
app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/subscriptions", subscriptionsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(env.PORT);
app.listen(port, () => {
  console.log(`Digital Heroes API listening on port ${port}`);
});
