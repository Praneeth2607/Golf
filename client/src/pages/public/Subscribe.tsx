import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { usePlans } from "@/hooks/usePlans";
import { formatPaise } from "@/lib/money";
import { api } from "@/lib/api";

type PlanKey = "MONTHLY" | "YEARLY";

interface CheckoutResponse {
  subscriptionId: string;
  provider: "mock" | "razorpay";
  mode: "mock" | "redirect";
  checkout: Record<string, unknown>;
}

export default function Subscribe() {
  const { profile, refreshProfile } = useAuthStore();
  const { data, isLoading } = usePlans();
  const [selected, setSelected] = useState<PlanKey>("MONTHLY");
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [busy, setBusy] = useState<"checkout" | "simulate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"activated" | "failed" | null>(null);

  const plan = data?.plans.find((p) => p.plan === selected);
  const activeSubscription = profile?.subscriptions?.[0];
  const hasActive = activeSubscription?.status === "ACTIVE";

  async function startCheckout() {
    setError(null);
    setBusy("checkout");
    try {
      const res = await api.post<CheckoutResponse>("/subscriptions/checkout", { plan: selected });
      setCheckout(res.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Couldn't start checkout. Please try again."
      );
    } finally {
      setBusy(null);
    }
  }

  async function simulate(event: "ACTIVATED" | "PAYMENT_FAILED") {
    if (!checkout) return;
    setBusy("simulate");
    setError(null);
    try {
      await api.post("/subscriptions/mock/simulate", { subscriptionId: checkout.subscriptionId, event });
      await refreshProfile();
      setOutcome(event === "ACTIVATED" ? "activated" : "failed");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Couldn't simulate that event."
      );
    } finally {
      setBusy(null);
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8">
        <h1 className="text-3xl">Create an account to subscribe.</h1>
        <p className="mt-3 text-body">
          Pricing is public, but subscribing needs an account so we can track your scores,
          charity, and draw entries.
        </p>
        <Link
          to="/signup"
          className="mt-8 inline-block rounded-full bg-wise-green px-7 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active"
        >
          Create account
        </Link>
      </div>
    );
  }

  if (hasActive) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8">
        <h1 className="text-3xl">You're already subscribed.</h1>
        <p className="mt-3 text-body">
          {activeSubscription.plan} plan · manage or cancel from your dashboard.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-block rounded-full bg-wise-green px-7 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (outcome === "activated") {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8">
        <h1 className="text-3xl">You're in.</h1>
        <p className="mt-3 text-body">
          Your subscription is active. Next: log your latest scores and pick a charity.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-block rounded-full bg-wise-green px-7 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-20 sm:px-8">
      <h1 className="text-3xl">Choose your plan.</h1>
      <p className="mt-2 text-body">You can switch or cancel any time from settings.</p>

      {!checkout ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {(["MONTHLY", "YEARLY"] as PlanKey[]).map((key) => {
              const p = data?.plans.find((pl) => pl.plan === key);
              const active = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    active ? "border-ink bg-canvas-soft" : "border-line hover:border-body"
                  }`}
                >
                  <span className="text-sm text-body">{key === "MONTHLY" ? "Monthly" : "Yearly"}</span>
                  <p className="mt-1 font-serif text-2xl">
                    {p ? formatPaise(p.amountPaise, p.currency) : isLoading ? "…" : "—"}
                  </p>
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 text-sm text-negative">{error}</p>}

          <button
            onClick={startCheckout}
            disabled={busy === "checkout" || !plan}
            className="mt-8 w-full rounded-full bg-wise-green px-6 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-60"
          >
            {busy === "checkout" ? "Starting checkout…" : `Subscribe · ${plan ? formatPaise(plan.amountPaise) : ""}`}
          </button>
        </>
      ) : checkout.mode === "mock" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-line bg-canvas-soft/60 p-6"
        >
          <p className="text-sm font-medium text-ink">Demo payment</p>
          <p className="mt-1 text-sm text-body">
            No real payment gateway is connected in this environment (see README). Use the
            buttons below to simulate the outcome — this exercises the exact same activation
            path a real webhook would trigger.
          </p>

          {error && <p className="mt-3 text-sm text-negative">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => simulate("ACTIVATED")}
              disabled={busy === "simulate"}
              className="flex-1 rounded-full bg-positive px-5 py-2.5 text-sm font-medium text-canvas transition hover:opacity-90 disabled:opacity-60"
            >
              Simulate successful payment
            </button>
            <button
              onClick={() => simulate("PAYMENT_FAILED")}
              disabled={busy === "simulate"}
              className="flex-1 rounded-full border border-negative px-5 py-2.5 text-sm text-negative transition hover:bg-negative/10 disabled:opacity-60"
            >
              Simulate failed payment
            </button>
          </div>

          {outcome === "failed" && (
            <p className="mt-4 text-sm text-negative">
              Payment failed. You can retry from your dashboard once this simulation completes.
            </p>
          )}
        </motion.div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/60 p-6 text-sm text-body">
          A live Razorpay checkout was started ({String(checkout.checkout.razorpaySubscriptionId)}), but this
          build doesn't yet embed the Razorpay Checkout widget on the frontend — that lands
          alongside real gateway credentials.
        </div>
      )}
    </div>
  );
}
