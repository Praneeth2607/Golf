import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminReports, useAdminTrends } from "@/hooks/useAdmin";
import { formatPaise } from "@/lib/money";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
      <p className="text-sm text-body">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-mute">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty?: boolean; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <h2 className="text-sm font-medium text-body">{title}</h2>
      {empty ? <p className="mt-4 text-sm text-body">Not enough data yet.</p> : <div className="mt-4 h-56">{children}</div>}
    </div>
  );
}

const axisTick = { fontSize: 12, fill: "var(--color-body)" };
const tooltipStyle = { borderRadius: 12, borderColor: "var(--color-line)", fontSize: 13 };

// Verification statuses are states, not identities — reserved status colors,
// not a cycled categorical palette (per the dataviz skill's status-color rule).
const FUNNEL_COLORS: Record<string, string> = {
  AWAITING_PROOF: "var(--color-warning)",
  SUBMITTED: "var(--color-accent-cyan)",
  APPROVED: "var(--color-positive)",
  REJECTED: "var(--color-negative)",
};

export default function AdminReports() {
  const { data, isLoading } = useAdminReports();
  const { data: trends, isLoading: trendsLoading } = useAdminTrends();

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl">Reports.</h1>
        <p className="mt-4 text-body">Loading…</p>
      </div>
    );
  }

  const charityChart = data.charityBreakdown.map((c) => ({ name: c.name, paise: c.totalPaise }));
  const drawChart = trends?.drawHistory.map((d) => ({ name: d.periodLabel, paise: d.prizePoolPaise })) ?? [];
  const subscriptionChart = trends?.subscriptionsByMonth ?? [];
  const funnelChart = trends
    ? (Object.entries(trends.verificationFunnel) as [string, number][]).map(([status, count]) => ({ status, count }))
    : [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Reports.</h1>
      <p className="mt-2 text-body">Platform totals, trends, and operational breakdowns.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total subscribers" value={String(data.totalUsers)} sub={`${data.subscribersByStatus.ACTIVE ?? 0} active`} />
        <StatTile label="Prize pool (published)" value={formatPaise(data.totalPrizePoolPaise)} />
        <StatTile label="Charity contributions" value={formatPaise(data.totalCharityContributedPaise)} sub={`+ ${formatPaise(data.totalDonatedPaise)} donated`} />
        <StatTile
          label="Payouts"
          value={formatPaise(data.totalPaidOutPaise)}
          sub={`${formatPaise(data.totalPendingPayoutPaise)} pending`}
        />
      </div>

      <div className="mt-10">
        <ChartCard title="Charity contribution totals" empty={charityChart.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charityChart} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-line)" />
              <XAxis type="number" tickFormatter={(v) => formatPaise(v)} tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ ...axisTick, fill: "var(--color-ink)" }} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} />
              <Tooltip formatter={(v) => formatPaise(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="paise" fill="var(--color-wise-green)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <ChartCard title="Prize pool by draw" empty={!trendsLoading && drawChart.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drawChart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} />
              <YAxis tickFormatter={(v) => formatPaise(v)} tick={axisTick} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v) => formatPaise(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="paise" fill="var(--color-wise-green)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New subscriptions (6 months)" empty={!trendsLoading && subscriptionChart.every((m) => m.count === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={subscriptionChart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="month" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="var(--color-wise-green)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-wise-green)" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="Winner verification funnel" empty={!trendsLoading && funnelChart.every((f) => f.count === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelChart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="status" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {funnelChart.map((f) => (
                  <Cell key={f.status} fill={FUNNEL_COLORS[f.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-6">
          <h2 className="text-sm font-medium text-body">Draw statistics</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-body">Total draws</dt>
              <dd>{data.draws.total}</dd>
            </div>
            {Object.entries(data.draws.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <dt className="text-body">{status}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-line p-6">
          <h2 className="text-sm font-medium text-body">Winners by tier</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {(["FIVE", "FOUR", "THREE"] as const).map((tier) => (
              <div key={tier} className="flex justify-between">
                <dt className="text-body">{tier}-number match</dt>
                <dd>{data.winnersByTier[tier] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
