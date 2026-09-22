import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export type Role = "SUBSCRIBER" | "ADMIN";

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  subscriptions: Array<{ status: string; plan: string; currentPeriodEnd: string | null }>;
}

interface AuthState {
  profile: Profile | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  status: "idle",
  error: null,

  init: async () => {
    set({ status: "loading" });
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await get().refreshProfile();
      } else {
        set({ profile: null, status: "ready" });
      }
    });

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await get().refreshProfile();
    } else {
      set({ status: "ready" });
    }
  },

  refreshProfile: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ profile: res.data.profile, status: "ready", error: null });
    } catch (err) {
      console.error("Failed to load profile", err);
      set({ profile: null, status: "ready", error: "Failed to load profile" });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null });
  },
}));
