import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShifts } from "../api/shift.api";
import { fetchRoster, bulkUpsertSchedule, fetchMySchedules } from "../api/staffSchedule.api";
import type { RosterParams, MyScheduleParams } from "../api/staffSchedule.api";
import type { BulkScheduleInput } from "../types";

export const useShifts = () =>
  useQuery({
    queryKey: ["shifts", { isActive: true }],
    queryFn:  () => fetchShifts({ isActive: true }),
    staleTime: 10 * 60 * 1000,
  });

export const useRoster = (params: RosterParams, enabled = true) =>
  useQuery({
    queryKey:           ["roster", params],
    queryFn:            () => fetchRoster(params),
    enabled:            enabled && !!params.branchId && !!params.startDate,
    retry:              2,
    retryDelay:         1000,
    refetchOnWindowFocus: true,  // auto-recover setelah server restart
  });

export const useBulkSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkScheduleInput) => bulkUpsertSchedule(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["roster"] }),
  });
};

export const useMySchedules = (params: MyScheduleParams, enabled = true) =>
  useQuery({
    queryKey: ["my-schedules", params],
    queryFn:  () => fetchMySchedules(params),
    enabled:  enabled && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000,
  });
