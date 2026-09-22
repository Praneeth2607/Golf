import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/** Subscriber-or-admin gate. Real authorization always happens server-side too. */
export function ProtectedRoute() {
  const { profile, status } = useAuthStore();

  if (status === "loading" || status === "idle") {
    return <div className="grid min-h-screen place-items-center text-body">Loading…</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { profile, status } = useAuthStore();

  if (status === "loading" || status === "idle") {
    return <div className="grid min-h-screen place-items-center text-body">Loading…</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { profile, status } = useAuthStore();

  if (status === "ready" && profile) {
    return <Navigate to={profile.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
  }

  return <Outlet />;
}
