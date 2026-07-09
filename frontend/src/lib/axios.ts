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

// Response interceptor — normalise errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);
