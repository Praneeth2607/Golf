import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminReports } from "@/hooks/useAdmin";
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

export default function AdminReports() {
  const { data, isLoading } = useAdminReports();

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl">Reports.</h1>
        <p className="mt-4 text-body">Loading…</p>
      </div>
    );
  }

  const chartData = data.charityBreakdown.map((c) => ({ name: c.name, paise: c.totalPaise }));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Reports.</h1>
      <p className="mt-2 text-body">Platform totals across users, charity giving, and draws.</p>

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

      <div className="mt-10 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-medium text-body">Charity contribution totals</h2>
        {chartData.length === 0 ? (
          <p className="mt-4 text-sm text-body">No contributions recorded yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-line)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatPaise(v)}
                  tick={{ fontSize: 12, fill: "var(--color-body)" }}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12, fill: "var(--color-ink)" }}
                  axisLine={{ stroke: "var(--color-line)" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatPaise(Number(v))}
                  contentStyle={{ borderRadius: 12, borderColor: "var(--color-line)", fontSize: 13 }}
                />
                <Bar dataKey="paise" fill="var(--color-wise-green)" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
