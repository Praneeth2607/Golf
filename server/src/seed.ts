import "dotenv/config";
import { supabaseAdmin } from "./lib/supabase";
import { prisma } from "./lib/prisma";
import { percentageOfPaise } from "./lib/money";
import { publishDraw } from "./services/draws";

// Demo/seed data, built up incrementally as milestones land:
// - Milestone 2: admin account + subscriber accounts covering each
//   subscription state (active monthly, active yearly, cancelled, lapsed, none).
// - Milestone 4: a charity directory, plus two subscribers wired to a chosen
//   charity with an actual contribution-history row, demonstrating the
//   subscription -> charity -> contribution relationship end to end.
// - Milestone 5: Stableford score history for a couple of subscribers (one
//   with a full 5, one partial) so the rolling-window UI has real data.
// - Milestone 6: a draw config, one already-published draw with a real
//   winner (seed hand-picked to guarantee a FIVE match against
//   active.monthly's ticket — see seedDraws below), and one open DRAFT draw
//   so the admin draw UI has something to simulate/publish live in a demo.
// Winner verification/payout seed data lands with Milestone 7.
//
// Safe to re-run: users/charities that already exist (by email/slug) are
// reused rather than duplicated, and demo subscriptions/contributions/draws
// are reset to a clean state each run.

const DEMO_PASSWORD = "Password123!";

interface SeedCharity {
  slug: string;
  name: string;
  summary: string;
  description: string;
  isFeatured: boolean;
  events?: { title: string; description: string; daysFromNow: number; location: string }[];
}

const CHARITIES: SeedCharity[] = [
  {
    slug: "fairway-futures",
    name: "Fairway Futures",
    summary: "Junior golf coaching and equipment for underserved schools.",
    description:
      "Fairway Futures runs free after-school golf coaching and supplies starter equipment to " +
      "government schools that could never otherwise offer the sport. Every rupee goes to " +
      "coaching hours, range time, and gear for first-time players.",
    isFeatured: true,
    events: [
      { title: "Coaching Clinic Day", description: "Open coaching session for new students.", daysFromNow: 21, location: "Bengaluru" },
    ],
  },
  {
    slug: "clean-water-collective",
    name: "Clean Water Collective",
    summary: "Builds and maintains community water filtration in drought-prone districts.",
    description:
      "The Clean Water Collective installs low-maintenance filtration units in villages facing " +
      "seasonal water shortages, and trains local volunteers to maintain them long after the " +
      "install team leaves.",
    isFeatured: true,
  },
  {
    slug: "second-chance-shelters",
    name: "Second Chance Shelters",
    summary: "Emergency shelter and job placement support for displaced families.",
    description:
      "Second Chance Shelters runs short-stay emergency housing and pairs residents with local " +
      "employers for job placement, aiming to move every family into stable housing within 90 days.",
    isFeatured: false,
  },
  {
    slug: "greenbelt-reforestation",
    name: "Greenbelt Reforestation Trust",
    summary: "Native-species reforestation along urban river buffers.",
    description:
      "Greenbelt plants and maintains native tree cover along river buffers to reduce urban " +
      "flooding and restore local bird and pollinator habitat.",
    isFeatured: false,
    events: [
      { title: "Community Planting Day", description: "Volunteer planting event, all ages welcome.", daysFromNow: 14, location: "Pune riverside" },
    ],
  },
  {
    slug: "bright-start-literacy",
    name: "Bright Start Literacy",
    summary: "Early-grade reading support in low-income communities.",
    description:
      "Bright Start places trained reading volunteers in under-resourced primary schools, focusing " +
      "on the critical grade 1-3 reading window.",
    isFeatured: false,
  },
];

interface SeedUser {
  email: string;
  fullName: string;
  role: "ADMIN" | "SUBSCRIBER";
  subscription?: {
    plan: "MONTHLY" | "YEARLY";
    status: "ACTIVE" | "CANCELLED" | "LAPSED";
    charitySlug?: string;
    charityPercentage?: number;
  };
  scores?: { daysAgo: number; strokes: number }[];
}

const USERS: SeedUser[] = [
  { email: "admin@digitalheroes.test", fullName: "Ada Admin", role: "ADMIN" },
  {
    email: "active.monthly@digitalheroes.test",
    fullName: "Mia Monthly",
    role: "SUBSCRIBER",
    subscription: { plan: "MONTHLY", status: "ACTIVE", charitySlug: "fairway-futures", charityPercentage: 10 },
    scores: [
      { daysAgo: 28, strokes: 32 },
      { daysAgo: 21, strokes: 29 },
      { daysAgo: 14, strokes: 35 },
      { daysAgo: 7, strokes: 31 },
      { daysAgo: 1, strokes: 28 },
    ],
  },
  {
    email: "active.yearly@digitalheroes.test",
    fullName: "Yuri Yearly",
    role: "SUBSCRIBER",
    subscription: { plan: "YEARLY", status: "ACTIVE", charitySlug: "clean-water-collective", charityPercentage: 20 },
    scores: [
      { daysAgo: 14, strokes: 30 },
      { daysAgo: 7, strokes: 27 },
      { daysAgo: 1, strokes: 33 },
    ],
  },
  {
    email: "cancelled@digitalheroes.test",
    fullName: "Cara Cancelled",
    role: "SUBSCRIBER",
    subscription: { plan: "MONTHLY", status: "CANCELLED" },
  },
  {
    email: "lapsed@digitalheroes.test",
    fullName: "Leo Lapsed",
    role: "SUBSCRIBER",
    subscription: { plan: "MONTHLY", status: "LAPSED" },
  },
  { email: "nosub@digitalheroes.test", fullName: "Nia Nosub", role: "SUBSCRIBER" },
];

const PLAN_AMOUNT_PAISE = { MONTHLY: 49_900, YEARLY: 499_900 } as const;

async function seedCharities(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const c of CHARITIES) {
    const charity = await prisma.charity.upsert({
      where: { slug: c.slug },
      update: { name: c.name, summary: c.summary, description: c.description, isFeatured: c.isFeatured, isActive: true },
      create: {
        slug: c.slug,
        name: c.name,
        summary: c.summary,
        description: c.description,
        isFeatured: c.isFeatured,
      },
    });
    slugToId.set(c.slug, charity.id);

    if (c.events) {
      await prisma.charityEvent.deleteMany({ where: { charityId: charity.id } });
      for (const e of c.events) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + e.daysFromNow);
        await prisma.charityEvent.create({
          data: { charityId: charity.id, title: e.title, description: e.description, eventDate, location: e.location },
        });
      }
    }
  }

  return slugToId;
}

async function getOrCreateAuthUser(user: SeedUser): Promise<string> {
  const existing = await prisma.profile.findUnique({ where: { email: user.email } });
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.fullName },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create ${user.email}: ${error?.message}`);
  }
  return data.user.id;
}

async function seedSubscription(
  userId: string,
  sub: NonNullable<SeedUser["subscription"]>,
  charitySlugToId: Map<string, string>
) {
  // Child rows first — neither CharityContribution nor SubscriptionEvent
  // cascade-delete from Subscription, so both must be cleared before the
  // subscription row itself.
  const existingSubs = await prisma.subscription.findMany({ where: { userId }, select: { id: true } });
  await prisma.subscriptionEvent.deleteMany({ where: { subscriptionId: { in: existingSubs.map((s) => s.id) } } });
  await prisma.charityContribution.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });

  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  if (sub.plan === "MONTHLY") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  if (sub.status === "LAPSED") {
    // Make it look like a subscription that ended a month ago.
    periodStart.setMonth(periodStart.getMonth() - 2);
    periodEnd.setMonth(periodEnd.getMonth() - 1);
  }

  const amountPaise = PLAN_AMOUNT_PAISE[sub.plan];
  const charityId = sub.charitySlug ? charitySlugToId.get(sub.charitySlug) : undefined;
  const charityPercentage = sub.charityPercentage ?? 10;

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan: sub.plan,
      status: sub.status,
      amountPaise,
      currency: "INR",
      paymentProvider: "mock",
      providerSubscriptionId: `mock_seed_${userId}`,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.status === "CANCELLED",
      ...(charityId ? { charityId, charityPercentage } : {}),
    },
  });

  // For an ACTIVE subscription with a charity chosen, seed the contribution
  // history row a real charge would have produced — so the dashboard/charity
  // pages have real numbers to show, not just an empty state.
  if (sub.status === "ACTIVE" && charityId) {
    await prisma.charityContribution.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        charityId,
        percentage: charityPercentage,
        amountPaise: percentageOfPaise(amountPaise, charityPercentage),
        periodStart,
        periodEnd,
      },
    });
  }
}

async function seedScores(userId: string, scores: NonNullable<SeedUser["scores"]>) {
  await prisma.score.deleteMany({ where: { userId } });

  for (const s of scores) {
    const playedOn = new Date();
    playedOn.setDate(playedOn.getDate() - s.daysAgo);
    await prisma.score.create({ data: { userId, strokes: s.strokes, playedOn } });
  }
}

async function deleteDrawByPeriod(periodLabel: string) {
  const draw = await prisma.draw.findUnique({ where: { periodLabel } });
  if (!draw) return;

  const winners = await prisma.drawWinner.findMany({ where: { drawId: draw.id } });
  for (const w of winners) {
    await prisma.payout.deleteMany({ where: { drawWinnerId: w.id } });
    await prisma.winnerVerification.deleteMany({ where: { drawWinnerId: w.id } });
  }
  await prisma.drawWinner.deleteMany({ where: { drawId: draw.id } });
  await prisma.draw.delete({ where: { id: draw.id } }); // cascades tickets + simulations
}

async function seedDraws(adminId: string) {
  await prisma.drawConfiguration.updateMany({ where: { isActive: true }, data: { isActive: false } });
  await prisma.drawConfiguration.create({
    data: { method: "RANDOM", tier5PoolPct: 40, tier4PoolPct: 35, tier3PoolPct: 25, prizePoolPctOfSub: 20, isActive: true },
  });

  await deleteDrawByPeriod("2026-08");
  const lastMonthDraw = await prisma.draw.create({
    data: { periodLabel: "2026-08", method: "RANDOM", status: "DRAFT" },
  });
  // Seed hand-picked (see server/README notes / commit history) to guarantee
  // a FIVE-number match against active.monthly's seeded ticket [28,29,31,32,35],
  // so the winner -> verification -> payout chain has real demo data.
  await publishDraw(lastMonthDraw.id, adminId, "probe-189702");

  await deleteDrawByPeriod("2026-09");
  await prisma.draw.create({
    data: { periodLabel: "2026-09", method: "RANDOM", status: "DRAFT" },
  });
}

async function main() {
  console.log("Seeding charities...");
  const charitySlugToId = await seedCharities();
  console.log(`  ✓ ${CHARITIES.length} charities\n`);

  console.log(`Seeding ${USERS.length} demo accounts...\n`);

  let adminId: string | null = null;

  for (const user of USERS) {
    const userId = await getOrCreateAuthUser(user);
    if (user.role === "ADMIN") adminId = userId;

    await prisma.profile.update({
      where: { id: userId },
      data: { fullName: user.fullName, role: user.role },
    });

    if (user.subscription) {
      await seedSubscription(userId, user.subscription, charitySlugToId);
    }
    if (user.scores) {
      await seedScores(userId, user.scores);
    }

    console.log(`  ✓ ${user.email} (${user.role}${user.subscription ? `, ${user.subscription.status}` : ""})`);
  }

  console.log("\nSeeding draws...");
  await seedDraws(adminId!);
  console.log("  ✓ 1 published draw (2026-08, with a real winner) + 1 draft draw (2026-09)");

  console.log(`\nAll demo accounts use the password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("\nSeed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
