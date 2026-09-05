import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, AuthUser } from "@/types/pos";

const STORAGE_KEY = "pos_auth_session";

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      clearSession: () => set({ session: null, user: null }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ session: state.session, user: state.user }),
    },
  ),
);

export const readStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const payload = window.localStorage.getItem(STORAGE_KEY);
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(payload) as { state?: { session?: AuthSession | null } };
    return parsed?.state?.session ?? null;
  } catch {
    return null;
  }
};
