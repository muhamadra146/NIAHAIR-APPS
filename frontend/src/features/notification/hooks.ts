import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { fetchNotifications, fetchNotificationSummary, markNotificationRead, markAllNotificationsRead } from "./api";

// Diperbarui otomatis tiap 1 menit (keputusan user: notifikasi di aplikasi + email)
const POLL_MS = 60_000;

export function useNotificationSummary() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey:        ["notifications", "summary"],
    queryFn:         fetchNotificationSummary,
    enabled:         !!token,
    refetchInterval: POLL_MS,
    staleTime:       30_000,
  });
}

export function useNotifications(open: boolean) {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn:  () => fetchNotifications(20),
    enabled:  open,
    staleTime: 0,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
