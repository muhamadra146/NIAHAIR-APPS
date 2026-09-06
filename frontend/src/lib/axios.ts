import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — prefix /api/v1, attach Authorization and X-Branch-Id
api.interceptors.request.use((config) => {
  const { token, branchId } = useAuthStore.getState();

  // Prefix all API paths with /api/v1 unless already versioned
  if (config.url && !config.url.startsWith("/api/")) {
    config.url = `/api/v1${config.url}`;
  }

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  if (branchId) {
    config.headers["X-Branch-Id"] = branchId;
  }

  return config;
});

// ── Refresh Token Logic ───────────────────────────────────────────────────────

let isRefreshing  = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (newToken: string) => {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
};

const doLogout = () => {
  useAuthStore.getState().logout();
  window.location.href = "/login";
};

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Normalise error message
    const buildError = () => {
      const message    = error.response?.data?.message ?? error.message;
      const fieldErrors: { field: string; message: string }[] | undefined =
        error.response?.data?.errors;
      const detail = fieldErrors?.map((e) => e.message).join(", ");
      return new Error(detail ? `${message}: ${detail}` : message);
    };

    if (error.response?.status !== 401) {
      return Promise.reject(buildError());
    }

    // Don't retry auth endpoints themselves
    const url: string = originalRequest.url ?? "";
    if (
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout")
    ) {
      // Login-page 401 → just surface the error; don't logout
      if (url.includes("/auth/login")) {
        return Promise.reject(buildError());
      }
      doLogout();
      return Promise.reject(buildError());
    }

    const { token, refreshToken, setTokens } = useAuthStore.getState();

    // No token at all → just surface the error
    if (!token) {
      return Promise.reject(buildError());
    }

    // Already retried once → give up
    if (originalRequest._retry) {
      doLogout();
      return Promise.reject(buildError());
    }

    // No refresh token → force logout
    if (!refreshToken) {
      doLogout();
      return Promise.reject(buildError());
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
        // If refresh ultimately fails the queue will never resolve — add a fallback
        // by listening to the logout redirect (page navigation handles it)
        void reject; // suppress unused warning
      });
    }

    // Start refresh
    originalRequest._retry = true;
    isRefreshing            = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/v1/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      const newToken        = data.data.token as string;
      const newRefreshToken = data.data.refreshToken as string;

      setTokens(newToken, newRefreshToken);
      processQueue(newToken);

      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch {
      refreshQueue = [];
      doLogout();
      return Promise.reject(buildError());
    } finally {
      isRefreshing = false;
    }
  },
);
