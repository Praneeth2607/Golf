import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStatus, useContributions } from "@/hooks/useSubscription";
import { useScores } from "@/hooks/useScores";
import { usePublishedDraws, useMyParticipation } from "@/hooks/useDraws";
import { useMyWinnings } from "@/hooks/useWinners";
import { formatPaise } from "@/lib/money";

function Tile({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <Link to={to} className="block rounded-2xl border border-line bg-canvas-soft/50 p-5 transition hover:border-body">
      <h3 className="text-sm font-medium text-body">{title}</h3>
      <div className="mt-2">{children}</div>
    </Link>
  );
}

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const subscription = profile?.subscriptions?.[0];
  const { data: subscriptionDetail } = useSubscriptionStatus();
  const { data: contributions } = useContributions();
  const { data: scores } = useScores();
  const { data: draws } = usePublishedDraws();
  const { data: participation } = useMyParticipation();
  const latestDraw = draws?.[0];
  const latestParticipation = participation?.find((p) => p.drawId === latestDraw?.id);
  const { data: winnings } = useMyWinnings();

  const hasActiveSub = subscription?.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}.</h1>

      {/* Subscription status — the one thing that gates everything else, so it
          leads, but stays compact once active rather than competing with the
          draw/winnings content underneath for attention. */}
      {hasActiveSub ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-body">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          Active · {subscription.plan.toLowerCase()} plan
          {subscription.currentPeriodEnd ? ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ""}
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-wise-green bg-wise-green/10 p-5">
          <p className="font-medium text-ink">
            {subscription ? `Your subscription is ${subscription.status.toLowerCase()}.` : "You're not subscribed yet."}
          </p>
          <p className="mt-1 text-sm text-body">Subscribe to log scores, pick a charity, and enter the monthly draw.</p>
          <Link
            to="/subscribe"
            className="mt-3 inline-block rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active"
          >
            Subscribe
          </Link>
        </div>
      )}

      {/* Hero: the payoff — this month's draw and how you did in it. */}
      <div className="mt-6 rounded-2xl border border-line bg-ink-deep p-6 text-canvas sm:p-8">
        {latestDraw ? (
          <>
            <p className="text-sm text-canvas/70">Latest draw · {latestDraw.periodLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {latestDraw.winningNumbers.map((n) => (
                <span key={n} className="grid h-9 w-9 place-items-center rounded-full bg-wise-green text-sm font-medium text-ink-deep">
                  {n}
                </span>
              ))}
            </div>
            <p className="mt-4 text-canvas/90">
              {latestParticipation?.won
                ? `You won ${formatPaise(latestParticipation.won.prizeAmountPaise)} this month — head to Winnings to upload proof.`
                : latestParticipation
                  ? "No match this time — your next 5 scores are your next ticket."
                  : "You weren't entered — log a score before the next draw to take part."}
            </p>
            <p className="mt-3 text-sm text-canvas/60">
              Entered {participation?.length ?? 0} draw{participation?.length === 1 ? "" : "s"} so far.
            </p>
          </>
        ) : (
          <p className="text-canvas/80">No draws published yet — check back after the first one runs.</p>
        )}
      </div>

      {/* Secondary detail, at a glance. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile title="Your scores" to="/scores">
          {scores?.length ? (
            <>
              <p className="text-2xl font-serif">{scores[0].strokes}</p>
              <p className="mt-1 text-sm text-body">
                {new Date(scores[0].playedOn).toLocaleDateString()} · {scores.length}/5 logged
              </p>
            </>
          ) : (
            <p className="text-sm text-body">No scores yet — log your first round.</p>
          )}
        </Tile>

        <Tile title="Charity" to="/charity">
          {subscriptionDetail?.charity ? (
            <>
              <p className="text-lg">
                {subscriptionDetail.charity.name} · {Number(subscriptionDetail.charityPercentage)}%
              </p>
              <p className="mt-1 text-sm text-body">
                {contributions ? formatPaise(contributions.totalPaise) : "—"} contributed to date
              </p>
            </>
          ) : (
            <p className="text-sm text-body">No charity selected yet — choose one.</p>
          )}
        </Tile>

        <Tile title="Winnings" to="/winnings">
          {winnings?.winners.length ? (
            <>
              <p className="text-2xl font-serif">{formatPaise(winnings.totalWonPaise)}</p>
              <p className="mt-1 text-sm text-body">{formatPaise(winnings.totalPaidPaise)} paid out</p>
            </>
          ) : (
            <p className="text-sm text-body">No wins yet — keep logging scores.</p>
          )}
        </Tile>
      </div>
    </div>
  );
}
