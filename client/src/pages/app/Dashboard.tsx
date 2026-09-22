import type { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

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

        <Card title="This month's draw" accent>
          <p className="text-sm text-canvas/70">Draw system lands in the draw-engine milestone.</p>
        </Card>

        <Card title="Your scores">
          <p className="text-sm text-body">Score entry lands in the score-management milestone.</p>
        </Card>

        <Card title="Charity & winnings">
          <p className="text-sm text-body">
            Charity selection and winnings tracking land in upcoming milestones.
          </p>
        </Card>
      </div>
    </div>
  );
}
