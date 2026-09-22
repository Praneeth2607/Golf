import { useState } from "react";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useAdminSubscriptions, useInvalidateAdminUsers } from "@/hooks/useAdmin";
import { formatPaise } from "@/lib/money";

function errorMessage(err: unknown, fallback: string) {
  return (err as AxiosError<{ error?: string }>)?.response?.data?.error ?? fallback;
}

const STATUS_FILTERS = ["", "ACTIVE", "PAST_DUE", "CANCELLED", "LAPSED", "INCOMPLETE"];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-positive/20 text-positive-deep",
  PAST_DUE: "bg-warning/20 text-warning-content",
  CANCELLED: "bg-negative/10 text-negative",
  LAPSED: "bg-mute/20 text-body",
  INCOMPLETE: "bg-mute/20 text-body",
};

export default function AdminSubscriptions() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data: subscriptions, isLoading } = useAdminSubscriptions({ status, q });
  const invalidate = useInvalidateAdminUsers();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancel(id: string) {
    setCancelling(id);
    setError(null);
    try {
      await api.post(`/admin/subscriptions/${id}/cancel`, {});
      invalidate();
    } catch (err) {
      setError(errorMessage(err, "Couldn't cancel."));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Subscriptions.</h1>
      <p className="mt-2 text-body">Every subscription across the platform.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by user…"
          className="rounded-full border border-line bg-canvas px-4 py-2 text-sm outline-none focus:border-wise-green"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                status === s ? "border-ink bg-ink text-canvas" : "border-line text-body hover:border-ink"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-negative">{error}</p>}
      {isLoading && <p className="mt-8 text-body">Loading…</p>}
      {subscriptions?.length === 0 && <p className="mt-8 text-body">No subscriptions match.</p>}

      <div className="mt-6 space-y-2">
        {subscriptions?.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
            <div>
              <span className="font-medium">{s.user.fullName ?? s.user.email}</span>
              <span className="ml-2 text-sm text-body">
                {s.plan} · {formatPaise(s.amountPaise)}
                {s.charity ? ` · ${s.charity.name}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[s.status] ?? ""}`}>
                {s.status}
                {s.cancelAtPeriodEnd ? " (ending)" : ""}
              </span>
              {(s.status === "ACTIVE" || s.status === "PAST_DUE") && (
                <button
                  onClick={() => cancel(s.id)}
                  disabled={cancelling === s.id}
                  className="text-sm text-negative underline underline-offset-4"
                >
                  {cancelling === s.id ? "Cancelling…" : "Cancel"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
