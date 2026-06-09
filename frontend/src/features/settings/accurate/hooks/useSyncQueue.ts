import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSyncQueues, retrySyncQueue } from "../api/syncQueue.api";
import type { SyncQueueListParams } from "../types";

export const useSyncQueues = (params: SyncQueueListParams = {}) =>
  useQuery({
    queryKey: ["syncQueues", params],
    queryFn:  () => fetchSyncQueues(params),
  });

export const useRetrySyncQueue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => retrySyncQueue(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["syncQueues"] }); },
  });
};
