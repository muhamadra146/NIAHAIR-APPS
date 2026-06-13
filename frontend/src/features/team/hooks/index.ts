import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSchedules, fetchSchedule,
  createSchedule, updateSchedule, deleteSchedule,
} from "../api/schedule.api";
import {
  fetchDailyRoster, fetchAttendances,
  checkIn, checkOut, manualSetAttendance,
} from "../api/attendance.api";
import type {
  ScheduleListParams, AttendanceListParams,
  CreateScheduleInput, UpdateScheduleInput,
  CheckInInput, ManualSetInput,
} from "../types";

// ── Schedules ─────────────────────────────────────────────────────────────────

export const useSchedules = (params: ScheduleListParams = {}) =>
  useQuery({
    queryKey: ["schedules", params],
    queryFn:  () => fetchSchedules(params),
  });

export const useSchedule = (id: string) =>
  useQuery({
    queryKey: ["schedules", id],
    queryFn:  () => fetchSchedule(id),
    enabled:  !!id,
  });

export const useCreateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduleInput) => createSchedule(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
};

export const useUpdateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScheduleInput }) =>
      updateSchedule(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
};

export const useDeleteSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
};

// ── Attendance ────────────────────────────────────────────────────────────────

export const useDailyRoster = (branchId: string, date: string) =>
  useQuery({
    queryKey: ["attendanceRoster", branchId, date],
    queryFn:  () => fetchDailyRoster(branchId, date),
    enabled:  !!branchId && !!date,
  });

export const useAttendances = (params: AttendanceListParams = {}) =>
  useQuery({
    queryKey: ["attendances", params],
    queryFn:  () => fetchAttendances(params),
  });

export const useCheckIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInInput) => checkIn(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["attendanceRoster"] }),
  });
};

export const useCheckOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInInput) => checkOut(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["attendanceRoster"] }),
  });
};

export const useManualSetAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualSetInput) => manualSetAttendance(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["attendanceRoster"] }),
  });
};
