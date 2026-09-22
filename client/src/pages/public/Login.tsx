import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { AuthShell } from "@/components/AuthShell";

export default function Login() {
  const navigate = useNavigate();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshProfile();
    navigate("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Log in to enter your latest round, check the draw, and see your charity's impact."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-body">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-body">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
        </label>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-wise-green px-6 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
