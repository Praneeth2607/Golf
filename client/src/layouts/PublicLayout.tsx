import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { to: "/charities", label: "Charities" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-body md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {profile ? (
              <Link
                to={profile.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-body hover:text-ink">
                  Log in
                </Link>
                <Link
                  to="/subscribe"
                  className="rounded-full bg-wise-green px-5 py-2 text-sm font-medium text-ink-deep transition hover:bg-green-active"
                >
                  Subscribe
                </Link>
              </>
            )}
          </div>

          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-line md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span className="block h-px w-4 bg-ink" />
              <span className="block h-px w-4 bg-ink" />
            </div>
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line md:hidden"
            >
              <div className="flex flex-col gap-4 px-5 py-5 text-sm">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                    {item.label}
                  </NavLink>
                ))}
                <hr className="border-line" />
                {profile ? (
                  <Link to={profile.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
                    <Link to="/subscribe" onClick={() => setOpen(false)} className="font-medium">
                      Subscribe
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-canvas-soft">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm text-body">
                Play your game, back a cause, and stay in the running for a monthly prize —
                every subscription gives back before it gives a chance to win.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
              <div className="flex flex-col gap-2">
                <span className="font-medium text-ink">Platform</span>
                <Link to="/how-it-works" className="text-body hover:text-ink">How it works</Link>
                <Link to="/pricing" className="text-body hover:text-ink">Pricing</Link>
                <Link to="/charities" className="text-body hover:text-ink">Charities</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-ink">Account</span>
                <Link to="/login" className="text-body hover:text-ink">Log in</Link>
                <Link to="/subscribe" className="text-body hover:text-ink">Subscribe</Link>
              </div>
            </div>
          </div>
          <p className="mt-10 text-xs text-mute">
            © {new Date().getFullYear()} Digital Heroes. Sample platform built for the Digital Heroes trainee selection process.
          </p>
        </div>
      </footer>
    </div>
  );
}
