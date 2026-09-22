import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCharities } from "@/hooks/useCharities";
import { useSubscriptionStatus, useContributions } from "@/hooks/useSubscription";
import { formatPaise } from "@/lib/money";

export default function Charity() {
  const queryClient = useQueryClient();
  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus();
  const { data: contributionData } = useContributions();
  const { data: charities } = useCharities();

  const [charityId, setCharityId] = useState("");
  const [percentage, setPercentage] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [donateCharityId, setDonateCharityId] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [donating, setDonating] = useState(false);
  const [donateMessage, setDonateMessage] = useState<string | null>(null);

  const hasActive = subscription?.status === "ACTIVE";

  async function onSelectCharity(e: FormEvent) {
    e.preventDefault();
    if (!charityId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch("/subscriptions/charity", { charityId, percentage });
      await queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      setSaved(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Couldn't save your charity selection."
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDonate(e: FormEvent) {
    e.preventDefault();
    const amountPaise = Math.round(Number(donateAmount) * 100);
    if (!donateCharityId || !amountPaise || amountPaise <= 0) return;
    setDonating(true);
    setDonateMessage(null);
    try {
      await api.post("/donations", { charityId: donateCharityId, amountPaise });
      setDonateMessage("Thank you — your donation was recorded.");
      setDonateAmount("");
    } catch (err: unknown) {
      setDonateMessage(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Donation failed."
      );
    } finally {
      setDonating(false);
    }
  }

  if (subLoading) {
    return <div className="mx-auto max-w-3xl px-5 py-10 text-body sm:px-8">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Your charity.</h1>
      <p className="mt-2 text-body">Choose who your subscription supports, and how much.</p>

      {!hasActive ? (
        <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6 text-sm text-body">
          You need an active subscription to select a charity.{" "}
          <Link to="/subscribe" className="font-medium text-ink underline underline-offset-4">
            Subscribe
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6">
            <h2 className="text-sm font-medium text-body">Current selection</h2>
            {subscription?.charity ? (
              <p className="mt-2 text-lg">
                {subscription.charity.name} · {Number(subscription.charityPercentage)}%
              </p>
            ) : (
              <p className="mt-2 text-body">No charity selected yet.</p>
            )}
          </div>

          <form onSubmit={onSelectCharity} className="mt-6 rounded-2xl border border-line p-6">
            <h2 className="text-sm font-medium text-body">
              {subscription?.charity ? "Change your charity" : "Choose a charity"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-body">Charity</span>
                <select
                  value={charityId}
                  onChange={(e) => setCharityId(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                >
                  <option value="">Select…</option>
                  {charities?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-body">Contribution % (min 10%)</span>
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={1}
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
                />
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-negative">{error}</p>}
            {saved && <p className="mt-3 text-sm text-positive-deep">Saved — takes effect from your next charge.</p>}

            <button
              type="submit"
              disabled={saving || !charityId}
              className="mt-5 rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save selection"}
            </button>
          </form>
        </>
      )}

      <div className="mt-10 rounded-2xl border border-line p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-body">Contribution history</h2>
          <span className="text-lg font-serif">
            {contributionData ? formatPaise(contributionData.totalPaise) : "—"} total
          </span>
        </div>
        {contributionData?.contributions.length ? (
          <ul className="mt-4 divide-y divide-line text-sm">
            {contributionData.contributions.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5">
                <span>
                  {c.charity.name} · {new Date(c.periodStart).toLocaleDateString()}
                </span>
                <span className="font-medium">{formatPaise(c.amountPaise)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-body">No contributions yet — they appear once your subscription charges.</p>
        )}
      </div>

      <form onSubmit={onDonate} className="mt-10 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-medium text-body">Make an independent donation</h2>
        <p className="mt-1 text-xs text-mute">Not tied to your subscription — give any amount, any time.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
          <select
            value={donateCharityId}
            onChange={(e) => setDonateCharityId(e.target.value)}
            required
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-wise-green"
          >
            <option value="">Select a charity…</option>
            {charities?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            step="0.01"
            placeholder="Amount (₹)"
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            required
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-wise-green"
          />
        </div>

        {donateMessage && <p className="mt-3 text-sm text-body">{donateMessage}</p>}

        <button
          type="submit"
          disabled={donating}
          className="mt-4 rounded-full border border-ink px-6 py-2.5 text-sm transition hover:bg-ink hover:text-canvas disabled:opacity-50"
        >
          {donating ? "Donating…" : "Donate"}
        </button>
      </form>
    </div>
  );
}
