import { useAuthStore } from "@/store/authStore";

export default function Settings() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl">Profile & settings</h1>
      <p className="mt-2 text-body">Basic account details. Editing lands in a later milestone.</p>

      <div className="mt-8 rounded-2xl border border-line bg-canvas-soft/50 p-6">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-body">Full name</dt>
            <dd className="mt-0.5">{profile?.fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-body">Email</dt>
            <dd className="mt-0.5">{profile?.email}</dd>
          </div>
          <div>
            <dt className="text-body">Role</dt>
            <dd className="mt-0.5">{profile?.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
