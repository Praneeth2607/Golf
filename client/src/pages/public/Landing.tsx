import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useCharities } from "@/hooks/useCharities";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const steps = [
  {
    n: "01",
    title: "Subscribe",
    body: "Join monthly or yearly. A fixed share of every subscription funds both the charity pool and the prize pool — set out plainly, before you pay a rupee.",
  },
  {
    n: "02",
    title: "Play your rounds",
    body: "Log your last five Stableford scores. They're more than a record — they become your entry into the month's draw.",
  },
  {
    n: "03",
    title: "Back a cause",
    body: "Choose a charity at signup and direct at least 10% of your subscription their way. Raise it whenever you like.",
  },
  {
    n: "04",
    title: "Enter the draw",
    body: "Each month we match your numbers against the draw. Three, four, or five matches unlock a share of that tier's pool.",
  },
];

const impactStats = [
  { value: "10%+", label: "of every subscription, minimum, goes to your chosen charity" },
  { value: "40/35/25", label: "prize-pool split across the 5, 4, and 3-number tiers" },
  { value: "Monthly", label: "draws, published with a full, auditable record" },
];

export default function Landing() {
  const { data: featured } = useCharities({ featured: true });
  const spotlight = featured?.[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink-deep text-canvas">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-wise-green/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-accent-orange/10 blur-3xl" />

        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-6 text-sm uppercase tracking-[0.2em] text-wise-green/90"
          >
            Golf performance · Charity · Monthly draw
          </motion.p>
          <motion.h1
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.05 }}
            className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl"
          >
            Your round supports a cause <span className="italic text-accent-orange">before</span> it earns you a shot at winning.
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="mt-6 max-w-xl text-lg text-canvas/75"
          >
            Digital Heroes turns your Stableford scores into a monthly prize draw — with a
            guaranteed share of every subscription going straight to a charity you choose.
          </motion.p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/subscribe"
              className="rounded-full bg-wise-green px-7 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active"
            >
              Subscribe & start playing
            </Link>
            <Link
              to="/how-it-works"
              className="rounded-full border border-canvas/25 px-7 py-3 text-sm text-canvas/90 transition hover:border-canvas/60"
            >
              See how the draw works
            </Link>
          </motion.div>
        </div>
      </section>

      {/* RELATIONSHIP STRIP */}
      <section className="border-b border-line bg-canvas-soft">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm text-body sm:text-base">
            <span className="font-medium text-ink">Participate</span>
            <span className="text-ink-deep">→</span>
            <span className="font-medium text-ink">Play your rounds</span>
            <span className="text-ink-deep">→</span>
            <span className="font-medium text-ink">Support a charity</span>
            <span className="text-ink-deep">→</span>
            <span className="font-medium text-ink">Enter the draw</span>
            <span className="text-ink-deep">→</span>
            <span className="font-medium text-ink">Possible win</span>
            <span className="text-ink-deep">→</span>
            <span className="font-medium text-ink">Verified payout</span>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="max-w-2xl"
        >
          <h2 className="text-3xl sm:text-4xl">What you actually do.</h2>
          <p className="mt-4 text-body">
            No clubhouse jargon, no traditional leaderboard theatrics — just four steps that
            connect your game to a cause and a chance to win.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ delay: i * 0.05 }}
              className="bg-canvas p-8"
            >
              <span className="font-serif text-3xl text-ink-deep">{step.n}</span>
              <h3 className="mt-4 text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-body">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CHARITY-LED SECTION */}
      <section className="bg-ink-deep text-canvas">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 md:grid-cols-2 md:items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <p className="text-sm uppercase tracking-[0.2em] text-wise-green/90">Charity first</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">
              The cause you back is the point — the draw is the incentive.
            </h2>
            <p className="mt-5 text-canvas/75">
              Every subscriber names a charity at signup and sends it at least 10% of their fee,
              automatically, every billing period. Want to give more? Raise the percentage
              whenever you like, or donate independently, any time.
            </p>
            <Link
              to="/charities"
              className="mt-8 inline-block rounded-full border border-canvas/25 px-6 py-3 text-sm transition hover:border-canvas/60"
            >
              Browse the charity directory
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="grid gap-4"
          >
            {impactStats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-canvas/15 bg-canvas/5 p-6">
                <div className="font-serif text-3xl text-accent-cyan">{s.value}</div>
                <p className="mt-2 text-sm text-canvas/70">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURED CHARITY SPOTLIGHT */}
      {spotlight && (
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="grid gap-8 rounded-2xl border border-line bg-canvas-soft/50 p-8 sm:p-10 md:grid-cols-[1fr_auto] md:items-center"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-ink-deep/70">This month's featured charity</p>
              <h2 className="mt-3 text-2xl sm:text-3xl">{spotlight.name}</h2>
              <p className="mt-3 max-w-xl text-body">{spotlight.summary}</p>
            </div>
            <Link
              to={`/charities/${spotlight.slug}`}
              className="shrink-0 rounded-full bg-wise-green px-6 py-3 text-center text-sm font-medium text-ink-deep transition hover:bg-green-active"
            >
              Meet {spotlight.name}
            </Link>
          </motion.div>
        </section>
      )}

      {/* FINAL CTA */}
      {/* Less bottom padding than other sections is deliberate, not an
          inconsistency: this is the last section before the footer, and on
          short viewports scrolled to the very bottom, extra trailing height
          here pushes this heading further under the sticky header rather
          than clear of it (verified empirically) — see the matching trim on
          the footer's own top padding below. */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-24 text-center sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <h2 className="text-3xl sm:text-4xl">Ready to play with purpose?</h2>
          <p className="mx-auto mt-4 max-w-xl text-body">
            Pick a plan, choose a charity, log your first round — the next draw is closer than
            you think.
          </p>
          <Link
            to="/subscribe"
            className="mt-8 inline-block rounded-full bg-wise-green px-8 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active"
          >
            Get started
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
