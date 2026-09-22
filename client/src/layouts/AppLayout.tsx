import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuthStore } from "@/store/authStore";

const links = [
  { to: "/dashboard", label: "Overview" },
  { to: "/scores", label: "Scores" },
  { to: "/charity", label: "Charity" },
  { to: "/draws", label: "Draws" },
  { to: "/winnings", label: "Winnings" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { profile, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      <aside className="border-b border-line bg-canvas-soft md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block md:px-6 md:py-6">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm md:flex-col md:gap-0.5 md:px-3 md:pb-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
                  isActive ? "bg-ink-deep text-canvas" : "text-body hover:bg-line/50"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line px-6 py-4 md:block">
          <p className="truncate text-sm font-medium">{profile?.fullName ?? profile?.email}</p>
          <button onClick={signOut} className="mt-1 text-xs text-body hover:text-ink">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
