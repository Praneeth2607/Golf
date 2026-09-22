import { Link } from "react-router-dom";
import { usePlans } from "@/hooks/usePlans";
import { formatPaise } from "@/lib/money";

const perks = [
  "Enter your last 5 Stableford scores, rolling automatically",
  "Automatic entry into the monthly prize draw",
  "At least 10% of your subscription goes to a charity you choose",
  "Full transparency: prize pool, charity share, and draw results are all published",
];

export default function Pricing() {
  const { data, isLoading, isError } = usePlans();

  const monthly = data?.plans.find((p) => p.plan === "MONTHLY");
  const yearly = data?.plans.find((p) => p.plan === "YEARLY");
  const monthlyEquivalent = yearly ? yearly.amountPaise / 12 : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
      <div className="max-w-xl">
        <h1 className="text-4xl sm:text-5xl">Simple pricing.</h1>
        <p className="mt-4 text-body">
          One subscription, two billing rhythms. Whichever you pick, the same share funds your
          charity and the monthly prize pool.
        </p>
      </div>

      {isLoading && <p className="mt-12 text-body">Loading plans…</p>}
      {isError && <p className="mt-12 text-negative">Couldn't load pricing right now.</p>}

      {data && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-8">
            <p className="text-sm text-body">Monthly</p>
            <p className="mt-2 font-serif text-4xl">
              {monthly ? formatPaise(monthly.amountPaise, monthly.currency) : "—"}
              <span className="text-base font-sans text-body"> /month</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-body">
              {perks.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-ink-deep">—</span>
                  {p}
                </li>
              ))}
            </ul>
            <Link
              to="/subscribe"
              className="mt-8 block rounded-full border border-ink px-6 py-3 text-center text-sm transition hover:bg-ink hover:text-canvas"
            >
              Choose monthly
            </Link>
          </div>

          <div className="relative rounded-2xl border border-ink-deep bg-ink-deep p-8 text-canvas">
            <span className="absolute -top-3 right-6 rounded-full bg-wise-green px-3 py-1 text-xs font-medium text-ink-deep">
              Best value
            </span>
            <p className="text-sm text-canvas/70">Yearly</p>
            <p className="mt-2 font-serif text-4xl">
              {yearly ? formatPaise(yearly.amountPaise, yearly.currency) : "—"}
              <span className="text-base font-sans text-canvas/60"> /year</span>
            </p>
            {monthlyEquivalent && (
              <p className="mt-1 text-xs text-canvas/60">
                ≈ {formatPaise(monthlyEquivalent, yearly?.currency)} / month
              </p>
            )}
            <ul className="mt-6 space-y-2.5 text-sm text-canvas/80">
              {perks.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-accent-orange">—</span>
                  {p}
                </li>
              ))}
            </ul>
            <Link
              to="/subscribe"
              className="mt-8 block rounded-full bg-wise-green px-6 py-3 text-center text-sm font-medium text-ink-deep transition hover:bg-green-active"
            >
              Choose yearly
            </Link>
          </div>
        </div>
      )}

      <p className="mt-10 text-xs text-body/70">
        Charity percentage is set to at least 10% automatically and can be raised any time from
        your dashboard. Cancel your subscription whenever you like — you keep access through the
        period you've already paid for.
      </p>
    </div>
  );
}
