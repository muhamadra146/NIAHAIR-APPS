import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { RosterData, BulkScheduleInput, MyScheduleItem } from "../types";
import type { AvailableStaff } from "@/features/appointment/types";

export interface RosterParams {
  startDate: string;
  days?:     number;
  branchId:  string;
}

export const fetchRoster = async (params: RosterParams): Promise<RosterData> => {
  const { data } = await api.get<ApiResponse<RosterData>>("/staff-schedules/roster", { params });
  return data.data;
};

export const bulkUpsertSchedule = async (
  input: BulkScheduleInput,
): Promise<{ updated: number }> => {
  const { data } = await api.post<ApiResponse<{ updated: number }>>(
    "/staff-schedules/bulk",
    input,
  );
  return data.data;
};

export const fetchAvailableStaff = async (params: {
  date:      string;
  branchId:  string;
  startTime: string;
  endTime:   string;
  excludeAppointmentId?: string;
}): Promise<AvailableStaff[]> => {
  const { data } = await api.get<ApiResponse<AvailableStaff[]>>(
    "/staff-schedules/available",
    { params },
  );
  return data.data ?? [];
};

export interface MyScheduleParams {
  startDate: string;
  endDate:   string;
}

export const fetchMySchedules = async (
  params: MyScheduleParams,
): Promise<MyScheduleItem[]> => {
  const { data } = await api.get<ApiResponse<MyScheduleItem[]>>(
    "/staff-schedules/my",
    { params },
  );
  return data.data ?? [];
};
