import { usePublishedDraws, useMyParticipation } from "@/hooks/useDraws";
import { formatPaise } from "@/lib/money";

const TIER_LABEL = { FIVE: "5-number match", FOUR: "4-number match", THREE: "3-number match" } as const;

function NumberBadge({ n, hit }: { n: number; hit?: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-medium ${
        hit ? "border-wise-green bg-wise-green/20 text-ink-deep" : "border-line text-body"
      }`}
    >
      {n}
    </span>
  );
}

export default function Draws() {
  const { data: draws, isLoading: drawsLoading } = usePublishedDraws();
  const { data: participation, isLoading: partLoading } = useMyParticipation();

  const latest = draws?.[0];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Draws.</h1>
      <p className="mt-2 text-body">
        Your ticket is your 5 most recent Stableford scores. Match 3, 4, or 5 of the month's
        drawn numbers to win a share of that tier's pool.
      </p>

      {drawsLoading && <p className="mt-8 text-body">Loading…</p>}

      {latest && (
        <div className="mt-8 rounded-2xl border border-line bg-ink-deep p-6 text-canvas">
          <p className="text-sm text-canvas/70">Latest draw · {latest.periodLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {latest.winningNumbers.map((n) => (
              <span key={n} className="grid h-9 w-9 place-items-center rounded-full bg-wise-green text-sm font-medium text-ink-deep">
                {n}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-canvas/60">5-match</p>
              <p className="mt-0.5">
                {formatPaise(latest.tier5PoolPaise ?? 0)} · {latest.winnerCounts.FIVE} winner
                {latest.winnerCounts.FIVE === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-canvas/60">4-match</p>
              <p className="mt-0.5">
                {formatPaise(latest.tier4PoolPaise ?? 0)} · {latest.winnerCounts.FOUR} winner
                {latest.winnerCounts.FOUR === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-canvas/60">3-match</p>
              <p className="mt-0.5">
                {formatPaise(latest.tier3PoolPaise ?? 0)} · {latest.winnerCounts.THREE} winner
                {latest.winnerCounts.THREE === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {!!latest.jackpotRolloverOutPaise && (
            <p className="mt-4 text-xs text-canvas/60">
              No 5-match winner — {formatPaise(latest.jackpotRolloverOutPaise)} rolls into next month's jackpot.
            </p>
          )}
        </div>
      )}

      {draws && draws.length === 0 && (
        <p className="mt-8 text-body">No draws have been published yet — check back after the next one runs.</p>
      )}

      <div className="mt-10">
        <h2 className="text-xl">Your participation</h2>
        {partLoading && <p className="mt-3 text-body">Loading…</p>}
        {participation?.length === 0 && (
          <p className="mt-3 text-sm text-body">
            You haven't entered a draw yet — log at least one score before the next draw runs.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {participation?.map((p) => {
            const winningSet = new Set(p.winningNumbers);
            return (
              <div key={p.drawId} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{p.periodLabel}</span>
                  {p.won ? (
                    <span className="rounded-full bg-wise-green/20 px-3 py-1 text-xs font-medium text-positive-deep">
                      Won · {TIER_LABEL[p.won.matchTier]} · {formatPaise(p.won.prizeAmountPaise)}
                    </span>
                  ) : (
                    <span className="text-xs text-mute">No match</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.yourNumbers.map((n, i) => (
                    <NumberBadge key={i} n={n} hit={winningSet.has(n)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
