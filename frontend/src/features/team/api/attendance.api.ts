import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  AttendanceRecord, AttendanceListParams,
  RosterAttendanceRow, CheckInInput, ManualSetInput,
} from "../types";

export const fetchDailyRoster = async (
  branchId: string,
  date: string,
): Promise<RosterAttendanceRow[]> => {
  const { data } = await api.get<ApiResponse<RosterAttendanceRow[]>>(
    "/attendance/roster",
    { params: { branchId, date } },
  );
  return data.data;
};

export const fetchAttendances = async (
  params: AttendanceListParams = {},
): Promise<PaginatedResponse<AttendanceRecord>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<AttendanceRecord>>>(
    "/attendance",
    { params },
  );
  return data.data;
};

export const checkIn = async (input: CheckInInput): Promise<AttendanceRecord> => {
  const { data } = await api.post<ApiResponse<AttendanceRecord>>("/attendance/check-in", input);
  return data.data;
};

export const checkOut = async (input: CheckInInput): Promise<AttendanceRecord> => {
  const { data } = await api.post<ApiResponse<AttendanceRecord>>("/attendance/check-out", input);
  return data.data;
};

export const manualSetAttendance = async (input: ManualSetInput): Promise<AttendanceRecord> => {
  const { data } = await api.post<ApiResponse<AttendanceRecord>>("/attendance/manual", input);
  return data.data;
};
