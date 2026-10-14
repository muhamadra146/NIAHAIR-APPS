import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface AppNotification {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  link:      string | null;
  isRead:    boolean;
  createdAt: string;
}

export interface NotificationSummary {
  unread:               number;
  /** Pengajuan menunggu persetujuan (hanya untuk penyetuju) */
  pendingApprovals:     { cuti: number; izin: number; sakit: number; koreksi: number } | null;
  pendingApprovalTotal: number;
}

export async function fetchNotifications(limit = 20): Promise<AppNotification[]> {
  const { data } = await api.get<ApiResponse<AppNotification[]>>("/notifications", { params: { limit } });
  return data.data;
}

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const { data } = await api.get<ApiResponse<NotificationSummary>>("/notifications/summary");
  return data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}
