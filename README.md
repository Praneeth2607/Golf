# Digital Heroes

Golf performance, charity giving, and a monthly draw-based reward engine — built to the
Digital Heroes PRD (Level 1).

## Status

Building milestone-by-milestone per the PRD's development process (§25). Current state:

- [x] **Milestone 1 — Project setup & authentication.** Monorepo scaffolded (Vite/React/TS
      client, Express/TS server, Prisma + Supabase Postgres schema). Supabase Auth wired
      end-to-end: register → login → JWT-verified session → role-aware routing
      (public / subscriber / admin), with role always re-checked server-side from the
      `profiles` table, never trusted from the client. Full database schema (§16) and RLS
      policies are in place even though most tables aren't wired to endpoints yet.
- [x] **Milestone 2 — Database and profiles.** Self-service profile editing
      (`PATCH /api/auth/me` — full name, audited; email/role are intentionally not editable
      here) wired to a real form in `client/src/pages/app/Settings.tsx`. `server/src/seed.ts`
      seeds an admin account plus subscriber accounts covering every subscription state
      (active monthly/yearly, cancelled, lapsed, none) — verified live end-to-end against a
      real Supabase project (see "Auth model" below for two real bugs this surfaced and fixed).
- [x] **Milestone 3 — Subscription/payment system.** Subscription lifecycle (checkout → active →
      cancelled/lapsed/past-due), plans, and cancellation are wired end-to-end behind a
      `PaymentProvider` interface (`server/src/lib/payments/`). Ships with a **mock provider**
      by default (no external account needed — see "Payment provider" below) and a **Razorpay
      provider** ready to switch on once real credentials work. Idempotent event handling,
      audit logging, and the pricing/subscribe pages are all live.
- [x] **Milestone 4 — Charity system.** Public directory (search + featured filter) at
      `/charities`, individual charity profiles with upcoming events, and a homepage spotlight
      section, all backed by real endpoints. Subscribers pick a charity + contribution % (min
      enforced server-side, `PATCH /api/subscriptions/charity`) from `/charity`, see their
      contribution history and running total, and can make independent one-off donations. Admins
      get full CRUD for charities and their events at `/admin/charities`. Closed a real schema
      gap along the way — see "Charity contribution model" below — and wired charity
      contributions to actually get created when a subscription charges (`applySubscriptionEvent`
      in `server/src/services/subscriptionEvents.ts`), not just when a charity is picked.
- [x] **Milestone 5 — Score management.** Stableford scores (1–45, one per date, DB-enforced)
      at `/scores`: add/edit/delete, with the rolling 5-score window enforced atomically
      server-side — `server/src/lib/scoreWindow.ts` (unit-tested) decides *which* score to evict
      by date, not insertion order, so backfilling an old round evicts itself rather than
      bumping a more recent one. Gated behind an active subscription, like other subscriber
      actions. Admins can look up any subscriber by email and edit/delete their scores at
      `/admin/scores` (full user search/list is Milestone 9; email lookup covers the PRD's
      "admin can edit golf scores" requirement in the meantime). Verified live: the full
      6-scores-in rolling window, duplicate-date rejection, future-date rejection, and the
      backfill-evicts-itself edge case all confirmed against the real database.
- [x] **Milestone 6 — Draw engine.** The engine is a set of pure, unit-tested functions
      (`server/src/draw/*.ts`: number generation, matching, prize-tier math) orchestrated by a
      DB-touching service (`server/src/services/draws.ts`) — every one of the PRD §26 functions
      (`calculateEligibleSubscribers`, `generateRandomDraw`/`generateAlgorithmicDraw`,
      `calculateMatches`, `allocatePrizes`, `applyJackpotRollover`, `createWinnerRecords`,
      `simulateDraw`, `publishDraw`) exists as a named, independently-testable function. Admin
      flow at `/admin/draws`: configure method/tier splits, create a monthly draw, simulate
      (writes only to `DrawSimulation`, never touches the real result), then publish — which
      atomically creates tickets, computes matches, splits each tier's pool equally among
      winners (remainder paise distributed, never dropped), and creates a `DrawWinner` +
      `WinnerVerification` (`AWAITING_PROOF`) + `Payout` (`PENDING`) row per winner. A Postgres
      trigger blocks any mutation of a published draw at the DB level, independent of the app
      logic. Subscribers see results and their own participation at `/draws`. Verified live end
      to end against the real database, including a seed deliberately chosen to produce a
      guaranteed 5-number-match winner, so the full ticket → match → prize-split →
      verification/payout-row chain was actually exercised, not just simulated in tests.
- [x] **Milestone 7 — Winner verification.** Full PRD §13 workflow:
      `AWAITING_PROOF → SUBMITTED → APPROVED/REJECTED → (approved) payout PENDING → PAID`, with
      the legal transitions centralized in `server/src/lib/verificationTransitions.ts`
      (unit-tested) so every route enforces the same rules instead of re-deriving them inline —
      including that a winner *can* re-submit after a rejection, but never after approval, and a
      payout can never be marked paid twice. Proof is a screenshot upload (Multer, JPEG/PNG/WEBP,
      5MB cap, type/size validated both by Multer and a pure `validateProofFile()`) stored in a
      **private** Supabase Storage bucket — every read goes through a short-lived signed URL
      generated server-side after an ownership-or-admin check, never a public path. Subscriber
      flow at `/winnings` (upload, view own proof, track status); admin review queue at
      `/admin/winners` (filter by status, view proof, approve/reject with notes, mark paid).
      Verified live end to end against the real database and a real Storage bucket: uploaded an
      actual PNG, confirmed a non-owner gets a 404 (not a leak) trying to view it, walked a
      winner through reject → resubmit → approve → payout, and confirmed a second payout
      attempt is blocked. That run also caught and fixed a pre-existing seed-script bug (missing
      `subscription_events` cleanup ordering, same class of issue as an earlier
      `charity_contributions` one).
- [ ] Milestone 8 — User dashboard (shell exists; data wiring pending)
- [ ] Milestone 9 — Admin dashboard (shell + role gating exists; features pending)
- [ ] Milestone 10 — Analytics and reports
- [ ] Milestone 11 — Testing
- [ ] Milestone 12 — Deployment

## Architecture

```
/client    Vite + React + TypeScript + Tailwind v4, React Router, Framer Motion, TanStack Query, Zustand
/server    Express + TypeScript, Prisma ORM, Supabase Auth (JWT verification), Razorpay (pending), Supabase Storage (pending)
/supabase  SQL migrations (source of truth for the DB schema; server/prisma/schema.prisma mirrors it)
```

**Auth model:** the frontend authenticates directly against Supabase Auth (email/password) and
sends the resulting access token as a Bearer header on every API call. The Express API verifies
that JWT itself and then looks up the caller's role from our own `profiles` table — the frontend
never asserts its own role. Row Level Security is also enabled on every table as defense-in-depth
in case anything ever talks to Supabase directly.

Supabase signs auth tokens one of two ways depending on when the project was created: **legacy**
projects use a shared HS256 secret (`SUPABASE_JWT_SECRET`); **newer** projects sign with an
asymmetric key (ES256/RS256) and publish the public key via JWKS instead — `SUPABASE_JWT_SECRET`
doesn't apply to them at all (what looks like a "JWT secret" in their dashboard is actually the
key's `kid`, not a signing secret). `server/src/middleware/auth.ts` checks each token's own
header and verifies against whichever scheme it was actually signed with
(`server/src/lib/jwks.ts` handles the asymmetric case). This was found and fixed while seeding
real demo data against a live newer-style Supabase project — worth knowing if `requireAuth`
starts rejecting valid tokens after switching Supabase projects.

**Money:** all amounts are stored and calculated as integer paise (INR minor units) — no
floating-point money math anywhere in the codebase (PRD §27).

**Draw numbers (documented assumption):** the PRD doesn't define what the 5/4/3-number "match"
actually refers to. This build derives each subscriber's monthly draw ticket from their own
logged Stableford scores (1–45, the same range as the winning numbers), snapshotted into
`draw_tickets` at publish time so results stay reproducible even if scores are later edited.
This is the single biggest interpretive call in the project. Two consequences worth knowing:

- A subscriber with fewer than 5 logged scores gets a shorter ticket, not a padded one — they
  can reach at most the tier their ticket size allows (3 scores → at most a THREE match). Partial
  participation gives partial odds, never an inflated or invalid one.
- "Algorithmic" mode doesn't just relabel random: winning numbers are sampled weighted by how
  often each number appears across all eligible tickets that month, so numbers many people
  actually shot are more likely to be drawn (`server/src/draw/numberGeneration.ts`) — a
  deliberate, testable difference from uniform random, not just a rename.

**Payment provider (documented deviation from the PRD's suggested stack):** the PRD names
Stripe but allows "Stripe or equivalent PCI-compliant provider" (§04). Stripe's India
onboarding is invite-only, so this build targets **Razorpay** instead. In practice, Razorpay
(and most Indian gateways) also gate dashboard/API access behind a business-KYC flow that an
individual/trainee project may not clear — so the app talks to payments through a
`PaymentProvider` interface (`server/src/lib/payments/types.ts`) with two implementations:

- **`mock`** (default, `PAYMENT_PROVIDER=mock`) — simulates the gateway entirely in-process.
  No external account, no KYC, no network calls. `POST /api/subscriptions/checkout` creates a
  real `Subscription` row exactly as it would with a live gateway; instead of a webhook,
  `POST /api/subscriptions/mock/simulate` drives it through the same status machine
  (`ACTIVATED` / `CHARGED` / `CANCELLED` / `COMPLETED` / `PAYMENT_FAILED`) via the shared
  `applySubscriptionEvent` service — so every lifecycle state in the PRD's testing checklist
  (§16.1) is actually exercisable in a demo, which is often harder to arrange reliably with a
  real gateway anyway.
- **`razorpay`** (`PAYMENT_PROVIDER=razorpay`) — the real integration: hosted subscriptions,
  signed webhooks (`POST /api/webhooks/razorpay`, HMAC-SHA256 verified), Plan-based pricing.
  Switching providers is one env var; no route or DB code changes since both implementations
  satisfy the same interface and write through the same `applySubscriptionEvent` service.

`npm run setup:razorpay-plans` (in `server/`) creates the Monthly/Yearly Plans in a real
Razorpay account once you have working test keys.

**Charity contribution model (schema gap found and closed in Milestone 4):** the original
schema only had `CharityContribution` — an immutable per-billing-period record of money already
moved. There was nowhere to store a subscriber's *current* charity choice, which the PRD
explicitly needs ("select charity at signup", dashboard shows "selected charity and contribution
percentage" — §08, §10). Fixed by adding `charityId` / `charityPercentage` directly to
`subscriptions` (migration `0003_charity_selection.sql`) — it's a property of the active
subscription, changeable any time via `PATCH /api/subscriptions/charity`, minimum percentage
enforced server-side (`CHARITY_MIN_PERCENTAGE` env var, default 10). A `CharityContribution` row
is only created when a real charge happens (`ACTIVATED`/`CHARGED` events in
`applySubscriptionEvent`) — selecting a charity doesn't itself create a contribution record,
charging money does. All contribution math goes through `percentageOfPaise()`
(`server/src/lib/money.ts`, unit-tested) — integer paise in, integer paise out, round-half-up,
documented once so every future money calculation (prize pools, payouts) stays consistent.

## Local development

Prerequisites: Node 20+, a Supabase project (free tier is fine). A Razorpay test account is
**not** required — the app runs on the mock payment provider out of the box.

```bash
npm run install:all

# server/.env and client/.env — copy from the .env.example files in each folder
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run the migrations in order: `0001_init.sql` (enums, tables, constraints,
   the `handle_new_user` trigger, RLS policies), `0002_provider_neutral_subscriptions.sql`
   (payment-provider column rename — harmless no-op on a fresh project), then
   `0003_charity_selection.sql` (adds charity selection to `subscriptions`). All are idempotent.
3. Copy Project URL, anon key, service-role key, and JWT secret (Settings → API) into
   `server/.env` and `client/.env`. If you're on a newer Supabase project (asymmetric
   ES256 signing keys), `SUPABASE_JWT_SECRET` can be left unset — see "Auth model" above.
4. If you use the pooler connection string (port 6543) for `DATABASE_URL`, append
   `?pgbouncer=true` — see the comment in `server/.env.example`.
5. Run `npm run setup:storage-bucket` (in `server/`) to create the private `winner-proofs`
   Storage bucket used for winner proof uploads — safe to re-run, it's a no-op if the bucket
   already exists.

### Seed data / demo accounts

```bash
cd server
npm run seed
```

Creates (or reuses, if re-run) 6 accounts covering every subscription state, all with password
`Password123!`:

| Email | Role | Subscription |
|---|---|---|
| `admin@digitalheroes.test` | Admin | — |
| `active.monthly@digitalheroes.test` | Subscriber | Active, monthly |
| `active.yearly@digitalheroes.test` | Subscriber | Active, yearly |
| `cancelled@digitalheroes.test` | Subscriber | Cancelled (at period end) |
| `lapsed@digitalheroes.test` | Subscriber | Lapsed |
| `nosub@digitalheroes.test` | Subscriber | None |

Also seeds 5 demo charities (2 featured, 2 with an upcoming event), wires `active.monthly` to
Fairway Futures (10%) and `active.yearly` to Clean Water Collective (20%) with a real
contribution-history row each, gives `active.monthly` a full 5-score history and `active.yearly`
a partial 3-score history, and seeds a draw config plus two draws: one already-**published**
draw (period `2026-08`) with a real winner — `active.monthly` guaranteed to hit a 5-number match,
so the winner/verification/payout chain has real data to look at — and one open **draft** draw
(`2026-09`) so the admin draw UI has something to simulate/publish live in a demo. The
2026-08 winner starts at a clean `AWAITING_PROOF` / `PENDING` state — proof upload, review, and
payout are left for you to walk through in the demo rather than pre-seeded, since that's the
whole point of the Milestone 7 UI.

### Payment provider setup

Nothing to do by default — `PAYMENT_PROVIDER=mock` in `server/.env.example` needs no account.
Subscribing via the app shows a "Demo payment" panel with buttons to simulate a successful or
failed payment.

To switch to real Razorpay once you have working credentials:

1. Create a test-mode account at dashboard.razorpay.com and grab the Key ID / Key Secret
   (Settings → API Keys). If Razorpay's onboarding blocks you without business KYC, stay on
   `mock` — see "Payment provider" above.
2. Run `npm run setup:razorpay-plans` (in `server/`, with `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`
   set) to create the Monthly/Yearly Plans and print their IDs; paste them into
   `RAZORPAY_PLAN_ID_MONTHLY` / `RAZORPAY_PLAN_ID_YEARLY`.
3. Add a webhook (Settings → Webhooks) pointing at
   `https://<your-deployed-api>/api/webhooks/razorpay` with the events
   `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
   `subscription.completed`, `payment.failed` — copy its secret into
   `RAZORPAY_WEBHOOK_SECRET`. For local testing, tunnel with `ngrok http 4000` and point the
   webhook at the ngrok URL, since Razorpay has no Stripe-CLI-style local forwarder.
4. Set `PAYMENT_PROVIDER=razorpay` in `server/.env`.

### Run

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173 (proxies /api to :4000)
```

### Database (Prisma)

`server/prisma/schema.prisma` mirrors `supabase/migrations/0001_init.sql` for the app's ORM
layer. After pointing `DATABASE_URL` at your Supabase Postgres connection string:

```bash
cd server
npx prisma generate
```

(Schema changes go through `supabase/migrations/*.sql` first since that's the authoritative
source, then are mirrored into `schema.prisma`.)

## Environment variables

See `server/.env.example` and `client/.env.example` for the full, documented list. Never commit
`.env` files or put the Razorpay key secret / Supabase service-role key / JWT secret in frontend
code.

## Testing

```bash
npm run test:server
```

Currently covers `percentageOfPaise()` / `splitEqually()` (money math), `idsToEvict()` (score
rolling-window), the draw engine's pure core (`calculateMatches`, `calculatePrizePool` /
`calculatePrizeTiers` / `applyJackpotRollover`, `generateRandomDraw` / `generateAlgorithmicDraw`
— including a statistical check that algorithmic mode is actually biased toward frequent
numbers), and the winner-verification state machine (`verificationTransitions.ts`) plus proof
file validation. Grows alongside each milestone; subscription lifecycle is next per PRD §24.

## Known limitations (current state)

- Auth, profile editing, subscriptions, the charity system, score management, the draw engine,
  and winner verification are functionally wired end-to-end and verified live against a real
  Supabase project and a real Storage bucket; most of the admin dashboard
  (users/subscriptions/reports) is routed but shows milestone placeholders.
- Jackpot rollover assumes draws are created and published in chronological order — a new
  draw's `jackpotRolloverInPaise` is copied from the most recently *published* draw at creation
  time. Publishing draws out of order (e.g. backfilling a skipped month) would carry the rollover
  incorrectly; not a concern for normal monthly operation, but worth knowing if testing manually.
- Donations are recorded directly (no payment capture step yet) — a documented simplification;
  see the comment in `server/src/routes/donations.ts` for how it'd plug into the same
  `PaymentProvider` the subscription flow already uses.
- Charity logos/cover images are still entered as URLs, not uploaded files. The Storage
  infrastructure they'd need now exists (built for winner-proof uploads in Milestone 7 —
  `server/src/lib/storage.ts`), just not yet wired up for charity media specifically.
- Payments run on the mock provider by default (see "Payment provider" above); the Razorpay
  provider is implemented but untested against a live account, since Razorpay's business-KYC
  onboarding is blocking that for now.
- No frontend Razorpay Checkout widget yet — only the mock demo-payment flow has a UI. Lands
  alongside working Razorpay credentials.
- Deployment (Vercel + hosted Postgres) not yet configured — see Milestone 12.
