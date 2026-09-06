import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";

/**
 * Panggil backend untuk revoke refresh token, lalu clear local state.
 * Jika backend error (mis. token sudah expired), tetap logout lokal.
 */
export function useLogout() {
  const navigate                    = useNavigate();
  const { refreshToken, logout }    = useAuthStore();

  const doLogout = useCallback(async () => {
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Backend error tidak menghalangi logout
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }, [refreshToken, logout, navigate]);

  return doLogout;
}
