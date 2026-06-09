import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

interface AuthStore {
  user:     AuthUser | null;
  token:    string | null;
  branchId: string | null;

  login:     (token: string, user: AuthUser) => void;
  logout:    () => void;
  setBranch: (branchId: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:     null,
      token:    null,
      branchId: null,

      login: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null, branchId: null }),

      setBranch: (branchId) => set({ branchId }),
    }),
    {
      name: "niahair-auth",
      // Only persist token + branchId; user is re-derived on refresh
      partialize: (state) => ({
        token:    state.token,
        user:     state.user,
        branchId: state.branchId,
      }),
    }
  )
);
