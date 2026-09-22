import { useState } from "react";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useAdminUsers, useAdminUserDetail, useInvalidateAdminUsers, useAdminSubscriptions } from "@/hooks/useAdmin";
import { formatPaise } from "@/lib/money";

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: users, isLoading } = useAdminUsers(q);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Users.</h1>
      <p className="mt-2 text-body">Search subscribers, review their activity, and manage their account.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="mt-6 w-full max-w-sm rounded-full border border-line bg-canvas px-5 py-2.5 text-sm outline-none focus:border-wise-green"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          {isLoading && <p className="text-body">Loading…</p>}
          {users?.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              className={`block w-full rounded-2xl border p-4 text-left transition ${
                selectedId === u.id ? "border-ink bg-canvas-soft" : "border-line hover:border-body"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{u.fullName ?? u.email}</span>
                <span className="text-xs text-mute">{u.role}</span>
              </div>
              <p className="mt-1 text-xs text-body">
                {u.email} · {u.latestSubscription?.status ?? "no subscription"} · {u.scoreCount} scores
              </p>
            </button>
          ))}
          {users?.length === 0 && <p className="text-sm text-body">No users match "{q}".</p>}
        </div>

        <div>{selectedId && <UserDetail id={selectedId} />}</div>
      </div>
    </div>
  );
}

function UserDetail({ id }: { id: string }) {
  const { data: user, isLoading } = useAdminUserDetail(id);
  const { data: subscriptions } = useAdminSubscriptions({ userId: id });
  const invalidate = useInvalidateAdminUsers();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  if (isLoading || !user) return <p className="text-body">Loading…</p>;

  async function saveName() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/admin/users/${id}`, { fullName });
      invalidate();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole() {
    setError(null);
    try {
      await api.patch(`/admin/users/${id}`, { role: user!.role === "ADMIN" ? "SUBSCRIBER" : "ADMIN" });
      invalidate();
    } catch (err) {
      setError(errorMessage(err, "Couldn't change role."));
    }
  }

  async function cancelSubscription(subId: string) {
    setCancelling(subId);
    setError(null);
    try {
      await api.post(`/admin/subscriptions/${subId}/cancel`, {});
      invalidate();
    } catch (err) {
      setError(errorMessage(err, "Couldn't cancel."));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{user.fullName ?? user.email}</h2>
          <p className="text-sm text-body">{user.email}</p>
        </div>
        <button onClick={toggleRole} className="rounded-full border border-line px-3 py-1 text-xs hover:border-ink">
          {user.role === "ADMIN" ? "Demote to subscriber" : "Promote to admin"}
        </button>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="text-body">Full name</span>
          <input
            defaultValue={user.fullName ?? ""}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 outline-none focus:border-wise-green"
          />
        </label>
        <button
          onClick={saveName}
          disabled={saving}
          className="rounded-full bg-wise-green px-4 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-negative">{error}</p>}

      <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-body">Charity given</dt>
          <dd className="mt-0.5 font-medium">{formatPaise(user.totalCharityContributedPaise)}</dd>
        </div>
        <div>
          <dt className="text-body">Donated</dt>
          <dd className="mt-0.5 font-medium">{formatPaise(user.totalDonatedPaise)}</dd>
        </div>
        <div>
          <dt className="text-body">Total won</dt>
          <dd className="mt-0.5 font-medium">{formatPaise(user.totalWonPaise)}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-body">Subscriptions</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {subscriptions?.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg bg-canvas-soft/50 px-3 py-2">
              <span>
                {s.plan} · {s.status} · {formatPaise(s.amountPaise)}
                {s.charity ? ` · ${s.charity.name}` : ""}
              </span>
              {(s.status === "ACTIVE" || s.status === "PAST_DUE") && (
                <button
                  onClick={() => cancelSubscription(s.id)}
                  disabled={cancelling === s.id}
                  className="text-negative underline underline-offset-4"
                >
                  {cancelling === s.id ? "Cancelling…" : "Cancel"}
                </button>
              )}
            </li>
          ))}
          {subscriptions?.length === 0 && <li className="text-mute">No subscriptions.</li>}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-body">Scores ({user.scores.length}/5)</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {user.scores.map((s) => (
            <li key={s.id} className="rounded-full border border-line px-3 py-1">
              {s.strokes} · {new Date(s.playedOn).toLocaleDateString()}
            </li>
          ))}
          {user.scores.length === 0 && <li className="text-mute">No scores.</li>}
        </ul>
      </div>

      {user.winners.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-body">Winnings</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {user.winners.map((w) => (
              <li key={w.id} className="flex items-center justify-between">
                <span>
                  {w.draw.periodLabel} · {w.matchTier}
                </span>
                <span className="text-mute">
                  {formatPaise(w.prizeAmountPaise)} · {w.verification?.status} · {w.payout?.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
