import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { AuthShell } from "@/components/AuthShell";

export default function Signup() {
  const navigate = useNavigate();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register", { fullName, email, password });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await refreshProfile();
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as Error)?.message ??
        "Something went wrong creating your account.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Subscribe, log scores, choose a charity, and enter the monthly draw."
      footer={
        <>
          Already subscribed?{" "}
          <Link to="/login" className="font-medium text-ink underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-body">Full name</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
        </label>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
          />
          <span className="text-xs text-body/70">At least 8 characters.</span>
        </label>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-wise-green px-6 py-3 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
