import { useState } from "react";
import type { FormEvent } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

export default function Settings() {
  const { profile, refreshProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = fullName.trim() !== (profile?.fullName ?? "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch("/auth/me", { fullName: fullName.trim() });
      await refreshProfile();
      setSaved(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Couldn't save your changes."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Profile & settings</h1>
      <p className="mt-2 text-body">Basic account details.</p>

      <form
        onSubmit={onSubmit}
        className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6"
      >
        <div className="space-y-5 text-sm">
          <label className="block">
            <span className="text-body">Full name</span>
            <input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setSaved(false);
              }}
              maxLength={120}
              required
              className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-4 py-2.5 outline-none focus:border-wise-green"
            />
          </label>

          <div>
            <span className="text-body">Email</span>
            <p className="mt-1.5 text-ink">{profile?.email}</p>
            <p className="mt-1 text-xs text-mute">
              Email changes aren't supported yet — contact support if this needs to change.
            </p>
          </div>

          <div>
            <span className="text-body">Role</span>
            <p className="mt-1.5 text-ink">{profile?.role}</p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-negative">{error}</p>}
        {saved && !dirty && <p className="mt-4 text-sm text-positive-deep">Saved.</p>}

        <button
          type="submit"
          disabled={!dirty || saving || fullName.trim().length === 0}
          className="mt-6 rounded-full bg-wise-green px-6 py-2.5 text-sm font-medium text-ink-deep transition hover:bg-green-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
