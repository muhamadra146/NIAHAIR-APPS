import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

interface AuthStore {
  user:         AuthUser | null;
  token:        string | null;
  refreshToken: string | null;
  branchId:     string | null;

  login:           (token: string, refreshToken: string, user: AuthUser) => void;
  logout:          () => void;
  setTokens:       (token: string, refreshToken: string) => void;
  setBranch:       (branchId: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:         null,
      token:        null,
      refreshToken: null,
      branchId:     null,

      login: (token, refreshToken, user) => set({ token, refreshToken, user }),

      logout: () => set({ token: null, refreshToken: null, user: null, branchId: null }),

      setTokens: (token, refreshToken) => set({ token, refreshToken }),

      setBranch: (branchId) => set({ branchId }),
    }),
    {
      name: "niahair-auth",
      partialize: (state) => ({
        token:        state.token,
        refreshToken: state.refreshToken,
        user:         state.user,
        branchId:     state.branchId,
      }),
    }
  )
);
