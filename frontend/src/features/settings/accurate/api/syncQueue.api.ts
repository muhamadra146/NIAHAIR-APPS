import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { SyncQueue, SyncQueueListParams } from "../types";

export const fetchSyncQueues = async (params: SyncQueueListParams = {}): Promise<PaginatedResponse<SyncQueue>> => {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)
  );
  const { data } = await api.get<ApiResponse<PaginatedResponse<SyncQueue>>>("/sync-queues", { params: cleaned });
  return data.data;
};

export const retrySyncQueue = async (id: string): Promise<SyncQueue> => {
  const { data } = await api.post<ApiResponse<SyncQueue>>(`/sync-queues/${id}/retry`);
  return data.data;
};
