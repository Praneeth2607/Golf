import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStatus, useContributions } from "@/hooks/useSubscription";
import { useScores } from "@/hooks/useScores";
import { usePublishedDraws, useMyParticipation } from "@/hooks/useDraws";
import { useMyWinnings } from "@/hooks/useWinners";
import { formatPaise } from "@/lib/money";

function Card({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-line p-6 ${accent ? "bg-ink-deep text-canvas" : "bg-canvas-soft/50"}`}>
      <h3 className={`text-sm font-medium ${accent ? "text-canvas/70" : "text-body"}`}>{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
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

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}.</h1>
      <p className="mt-2 text-body">Here's where your game, your charity, and this month's draw stand.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card title="Subscription">
          {subscription ? (
            <>
              <p className="text-2xl font-serif">{subscription.status}</p>
              <p className="mt-1 text-sm text-body">
                {subscription.plan} plan
                {subscription.currentPeriodEnd
                  ? ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-body">
              You don't have an active subscription yet.{" "}
              <a href="/subscribe" className="font-medium text-ink underline underline-offset-4">
                Subscribe
              </a>{" "}
              to start entering draws.
            </p>
          )}
        </Card>

        <Card title="Latest draw" accent>
          {latestDraw ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {latestDraw.winningNumbers.map((n) => (
                  <span key={n} className="grid h-7 w-7 place-items-center rounded-full bg-wise-green text-xs font-medium text-ink-deep">
                    {n}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-canvas/70">
                {latestDraw.periodLabel}
                {latestParticipation?.won
                  ? ` · you won ${formatPaise(latestParticipation.won.prizeAmountPaise)}!`
                  : latestParticipation
                    ? " · no match this time"
                    : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-canvas/70">No draws published yet.</p>
          )}
        </Card>

        <Card title="Your scores">
          {scores?.length ? (
            <>
              <p className="text-2xl font-serif">{scores[0].strokes}</p>
              <p className="mt-1 text-sm text-body">
                Latest round, {new Date(scores[0].playedOn).toLocaleDateString()} · {scores.length}/5 logged
              </p>
            </>
          ) : (
            <p className="text-sm text-body">
              No scores yet.{" "}
              <Link to="/scores" className="font-medium text-ink underline underline-offset-4">
                Log your first round
              </Link>
              .
            </p>
          )}
        </Card>

        <Card title="Charity">
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
            <p className="text-sm text-body">
              No charity selected yet.{" "}
              <Link to="/charity" className="font-medium text-ink underline underline-offset-4">
                Choose one
              </Link>
              .
            </p>
          )}
        </Card>

        <Card title="Winnings">
          {winnings?.winners.length ? (
            <>
              <p className="text-2xl font-serif">{formatPaise(winnings.totalWonPaise)}</p>
              <p className="mt-1 text-sm text-body">
                {formatPaise(winnings.totalPaidPaise)} paid out ·{" "}
                <Link to="/winnings" className="font-medium text-ink underline underline-offset-4">
                  View details
                </Link>
              </p>
            </>
          ) : (
            <p className="text-sm text-body">No wins yet — keep logging scores and stay in the draw.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
