import { Link } from "react-router-dom";
import { useAdminReports } from "@/hooks/useAdmin";
import { formatPaise } from "@/lib/money";

const LINKS = [
  { to: "/admin/users", label: "Users", note: "Search, edit profiles, manage subscriptions" },
  { to: "/admin/subscriptions", label: "Subscriptions", note: "Every subscription, filterable by status" },
  { to: "/admin/scores", label: "Scores", note: "Look up and correct a subscriber's scores" },
  { to: "/admin/draws", label: "Draws", note: "Configure, simulate, and publish monthly draws" },
  { to: "/admin/charities", label: "Charities", note: "Directory content and events" },
  { to: "/admin/winners", label: "Winners", note: "Review proof, approve, and pay out" },
  { to: "/admin/reports", label: "Reports", note: "Full totals and charts" },
];

export default function AdminDashboard() {
  const { data } = useAdminReports();

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Admin overview.</h1>
      <p className="mt-2 text-body">Everything you need to run the platform, at a glance.</p>

      {data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
            <p className="text-sm text-body">Subscribers</p>
            <p className="mt-1 font-serif text-2xl">{data.totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
            <p className="text-sm text-body">Prize pool</p>
            <p className="mt-1 font-serif text-2xl">{formatPaise(data.totalPrizePoolPaise)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas-soft/50 p-5">
            <p className="text-sm text-body">Charity given</p>
            <p className="mt-1 font-serif text-2xl">{formatPaise(data.totalCharityContributedPaise)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-deep p-5 text-canvas">
            <p className="text-sm text-canvas/70">Pending payouts</p>
            <p className="mt-1 font-serif text-2xl">{formatPaise(data.totalPendingPayoutPaise)}</p>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-2xl border border-line p-5 transition hover:border-wise-green"
          >
            <span className="font-medium">{l.label}</span>
            <p className="mt-1 text-sm text-body">{l.note}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
