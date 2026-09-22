import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { subscriptionsRouter } from "./routes/subscriptions";
import { charitiesRouter, adminCharitiesRouter } from "./routes/charities";
import { donationsRouter } from "./routes/donations";
import { scoresRouter, adminScoresRouter } from "./routes/scores";
import { drawsRouter, adminDrawsRouter } from "./routes/draws";
import { winnersRouter, adminWinnersRouter } from "./routes/winners";
import { adminUsersRouter } from "./routes/adminUsers";
import { adminSubscriptionsRouter } from "./routes/adminSubscriptions";
import { reportsRouter } from "./routes/reports";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { razorpayWebhookRouter } from "./routes/razorpayWebhook";

export const app = express();

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
app.use("/api/charities", charitiesRouter);
app.use("/api/admin/charities", adminCharitiesRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/scores", scoresRouter);
app.use("/api/admin/scores", adminScoresRouter);
app.use("/api/draws", drawsRouter);
app.use("/api/admin/draws", adminDrawsRouter);
app.use("/api/winners", winnersRouter);
app.use("/api/admin/winners", adminWinnersRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/subscriptions", adminSubscriptionsRouter);
app.use("/api/admin/reports", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Vercel's native Express framework detection finds this file by the
// conventional "app.ts" name and requires a default export specifically
// (it ignored api/index.ts's rewrite/function config once it recognized
// this as an Express project — see the "backend framework projects" build
// warning). The named export above is kept for src/index.ts's own local
// dev/traditional-host entry point.
export default app;
