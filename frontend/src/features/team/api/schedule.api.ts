import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  EmployeeSchedule,
  ScheduleListParams,
  CreateScheduleInput,
  UpdateScheduleInput,
  AvailableStaff,
} from "../types";

export const fetchSchedules = async (
  params: ScheduleListParams = {},
): Promise<PaginatedResponse<EmployeeSchedule>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<EmployeeSchedule>>>(
    "/staff-schedules",
    { params },
  );
  return data.data;
};

export const fetchSchedule = async (id: string): Promise<EmployeeSchedule> => {
  const { data } = await api.get<ApiResponse<EmployeeSchedule>>(`/staff-schedules/${id}`);
  return data.data;
};

export const createSchedule = async (
  input: CreateScheduleInput,
): Promise<EmployeeSchedule> => {
  const { data } = await api.post<ApiResponse<EmployeeSchedule>>("/staff-schedules", input);
  return data.data;
};

export const updateSchedule = async (
  id: string,
  input: UpdateScheduleInput,
): Promise<EmployeeSchedule> => {
  const { data } = await api.put<ApiResponse<EmployeeSchedule>>(`/staff-schedules/${id}`, input);
  return data.data;
};

export const deleteSchedule = async (id: string): Promise<void> => {
  await api.delete(`/staff-schedules/${id}`);
};

export const fetchAvailableStaff = async (params: {
  date: string;
  branchId: string;
}): Promise<AvailableStaff[]> => {
  const { data } = await api.get<ApiResponse<AvailableStaff[]>>(
    "/staff-schedules/available",
    { params },
  );
  return data.data;
};
