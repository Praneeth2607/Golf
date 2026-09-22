import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { formatPaise } from "@/lib/money";

interface DrawConfig {
  id: string;
  method: "RANDOM" | "ALGORITHMIC";
  tier5PoolPct: string;
  tier4PoolPct: string;
  tier3PoolPct: string;
  prizePoolPctOfSub: string;
}

interface AdminDrawListItem {
  id: string;
  periodLabel: string;
  method: "RANDOM" | "ALGORITHMIC";
  status: "DRAFT" | "SIMULATED" | "PUBLISHED";
  publishedAt: string | null;
  _count: { winners: number; tickets: number; simulations: number };
}

interface DrawDetail extends AdminDrawListItem {
  winningNumbers: number[];
  prizePoolPaise: number | null;
  tier5PoolPaise: number | null;
  tier4PoolPaise: number | null;
  tier3PoolPaise: number | null;
  eligibleSubscriberCount: number | null;
  jackpotRolloverInPaise: number;
  jackpotRolloverOutPaise: number | null;
  simulations: { id: string; seed: string; winningNumbers: number[]; resultSummary: Record<string, unknown>; createdAt: string }[];
  winners: {
    id: string;
    matchTier: "FIVE" | "FOUR" | "THREE";
    prizeAmountPaise: number;
    user: { email: string; fullName: string | null };
    verification: { status: string } | null;
    payout: { status: string } | null;
  }[];
}

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

function useDrawConfig() {
  return useQuery({
    queryKey: ["admin-draw-config"],
    queryFn: async () => (await api.get<{ config: DrawConfig }>("/admin/draws/config")).data.config,
  });
}

function useAdminDraws() {
  return useQuery({
    queryKey: ["admin-draws"],
    queryFn: async () => (await api.get<{ draws: AdminDrawListItem[] }>("/admin/draws")).data.draws,
  });
}

export default function AdminDraws() {
  const queryClient = useQueryClient();
  const { data: config } = useDrawConfig();
  const { data: draws, isLoading } = useAdminDraws();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [periodLabel, setPeriodLabel] = useState("");
  const [method, setMethod] = useState<"RANDOM" | "ALGORITHMIC">("RANDOM");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [configForm, setConfigForm] = useState<{ tier5: string; tier4: string; tier3: string; prize: string; method: "RANDOM" | "ALGORITHMIC" } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const activeForm =
    configForm ??
    (config
      ? { tier5: config.tier5PoolPct, tier4: config.tier4PoolPct, tier3: config.tier3PoolPct, prize: config.prizePoolPctOfSub, method: config.method }
      : null);

  async function refreshDraws() {
    await queryClient.invalidateQueries({ queryKey: ["admin-draws"] });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api.post("/admin/draws", { periodLabel, method });
      setPeriodLabel("");
      await refreshDraws();
    } catch (err) {
      setCreateError(errorMessage(err, "Couldn't create draw."));
    } finally {
      setCreating(false);
    }
  }

  async function onSaveConfig(e: FormEvent) {
    e.preventDefault();
    if (!activeForm) return;
    setConfigError(null);
    setSavingConfig(true);
    try {
      await api.put("/admin/draws/config", {
        method: activeForm.method,
        tier5Pct: Number(activeForm.tier5),
        tier4Pct: Number(activeForm.tier4),
        tier3Pct: Number(activeForm.tier3),
        prizePoolPct: Number(activeForm.prize),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-draw-config"] });
      setConfigForm(null);
    } catch (err) {
      setConfigError(errorMessage(err, "Couldn't save configuration."));
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Draws.</h1>
      <p className="mt-2 text-body">Configure draw logic, create monthly draws, simulate, and publish.</p>

      <form onSubmit={onSaveConfig} className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6">
        <h2 className="text-sm font-medium text-body">Draw configuration</h2>
        {activeForm && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-body">Method</span>
                <select
                  value={activeForm.method}
                  onChange={(e) => setConfigForm({ ...activeForm, method: e.target.value as "RANDOM" | "ALGORITHMIC" })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                >
                  <option value="RANDOM">Random</option>
                  <option value="ALGORITHMIC">Algorithmic (weighted by score frequency)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-body">Prize pool % of subscription</span>
                <input
                  type="number"
                  value={activeForm.prize}
                  onChange={(e) => setConfigForm({ ...activeForm, prize: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-body">5-match tier %</span>
                <input
                  type="number"
                  value={activeForm.tier5}
                  onChange={(e) => setConfigForm({ ...activeForm, tier5: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                />
              </label>
              <label className="block text-sm">
                <span className="text-body">4-match tier %</span>
                <input
                  type="number"
                  value={activeForm.tier4}
                  onChange={(e) => setConfigForm({ ...activeForm, tier4: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                />
              </label>
              <label className="block text-sm">
                <span className="text-body">3-match tier %</span>
                <input
                  type="number"
                  value={activeForm.tier3}
                  onChange={(e) => setConfigForm({ ...activeForm, tier3: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-mute">Tier percentages must add up to 100.</p>
            {configError && <p className="mt-2 text-sm text-negative">{configError}</p>}
            <button
              type="submit"
              disabled={savingConfig}
              className="mt-4 rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
            >
              {savingConfig ? "Saving…" : "Save configuration"}
            </button>
          </>
        )}
      </form>

      <form onSubmit={onCreate} className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-medium text-body">Create a new draw</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="text-body">Period (YYYY-MM)</span>
            <input
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="2026-10"
              required
              className="mt-1.5 block rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>
          <label className="text-sm">
            <span className="text-body">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as "RANDOM" | "ALGORITHMIC")}
              className="mt-1.5 block rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            >
              <option value="RANDOM">Random</option>
              <option value="ALGORITHMIC">Algorithmic</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-ink px-6 py-2.5 text-sm text-canvas transition hover:bg-body disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create draw"}
          </button>
        </div>
        {createError && <p className="mt-3 text-sm text-negative">{createError}</p>}
      </form>

      <div className="mt-10 space-y-3">
        {isLoading && <p className="text-body">Loading draws…</p>}
        {draws?.map((d) => (
          <DrawRow
            key={d.id}
            draw={d}
            expanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
            onChanged={refreshDraws}
          />
        ))}
      </div>
    </div>
  );
}

function DrawRow({
  draw,
  expanded,
  onToggle,
  onChanged,
}: {
  draw: AdminDrawListItem;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
}) {
  const { data: detail, refetch } = useQuery({
    queryKey: ["admin-draw", draw.id],
    queryFn: async () => (await api.get<{ draw: DrawDetail }>(`/admin/draws/${draw.id}`)).data.draw,
    enabled: expanded,
  });

  const [busy, setBusy] = useState<"simulate" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  async function simulate() {
    setBusy("simulate");
    setError(null);
    try {
      await api.post(`/admin/draws/${draw.id}/simulate`, {});
      await refetch();
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, "Simulation failed."));
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      await api.post(`/admin/draws/${draw.id}/publish`, {});
      await refetch();
      await onChanged();
      setConfirmingPublish(false);
    } catch (err) {
      setError(errorMessage(err, "Publish failed."));
    } finally {
      setBusy(null);
    }
  }

  const statusColor =
    draw.status === "PUBLISHED" ? "text-positive-deep" : draw.status === "SIMULATED" ? "text-accent-cyan" : "text-mute";

  return (
    <div className="rounded-2xl border border-line p-5">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <div>
          <span className="font-medium">{draw.periodLabel}</span>
          <span className="ml-3 text-sm text-body">{draw.method}</span>
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>{draw.status}</span>
      </button>

      {expanded && detail && (
        <div className="mt-5 border-t border-line pt-5">
          {detail.status === "PUBLISHED" ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {detail.winningNumbers.map((n) => (
                  <span key={n} className="grid h-8 w-8 place-items-center rounded-full bg-wise-green text-xs font-medium text-ink-deep">
                    {n}
                  </span>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-body">Eligible</dt>
                  <dd>{detail.eligibleSubscriberCount}</dd>
                </div>
                <div>
                  <dt className="text-body">Prize pool</dt>
                  <dd>{formatPaise(detail.prizePoolPaise ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-body">Rollover in</dt>
                  <dd>{formatPaise(detail.jackpotRolloverInPaise)}</dd>
                </div>
                <div>
                  <dt className="text-body">Rollover out</dt>
                  <dd>{formatPaise(detail.jackpotRolloverOutPaise ?? 0)}</dd>
                </div>
              </dl>

              {detail.winners.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-body">Winners</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {detail.winners.map((w) => (
                      <li key={w.id} className="flex items-center justify-between rounded-lg bg-canvas-soft/50 px-3 py-2">
                        <span>
                          {w.user.fullName ?? w.user.email} · {w.matchTier}
                        </span>
                        <span>
                          {formatPaise(w.prizeAmountPaise)} · {w.verification?.status} · {w.payout?.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={simulate}
                  disabled={busy !== null}
                  className="rounded-full border border-ink px-5 py-2 text-sm transition hover:bg-ink hover:text-canvas disabled:opacity-50"
                >
                  {busy === "simulate" ? "Simulating…" : "Run simulation"}
                </button>
                {!confirmingPublish ? (
                  <button
                    onClick={() => setConfirmingPublish(true)}
                    disabled={busy !== null}
                    className="rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
                  >
                    Publish
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-full border border-negative px-4 py-2 text-sm">
                    <span>Publishing is permanent. Confirm?</span>
                    <button onClick={publish} disabled={busy !== null} className="font-medium text-negative underline underline-offset-4">
                      {busy === "publish" ? "Publishing…" : "Yes, publish"}
                    </button>
                    <button onClick={() => setConfirmingPublish(false)} className="text-body underline underline-offset-4">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="mt-3 text-sm text-negative">{error}</p>}

              {detail.simulations.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-body">Latest simulation (preview only — not saved as a result)</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.simulations[0].winningNumbers.map((n) => (
                      <span key={n} className="grid h-8 w-8 place-items-center rounded-full border border-line text-xs">
                        {n}
                      </span>
                    ))}
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-canvas-soft/50 p-3 text-xs text-body">
                    {JSON.stringify(detail.simulations[0].resultSummary, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
