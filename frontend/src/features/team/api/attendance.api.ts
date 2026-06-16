import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  AttendanceRecord, AttendanceListParams,
  RosterAttendanceRow, CheckInInput, ManualSetInput,
  MyTodayResponse, MyAttendanceParams,
  AttendanceReportParams, AttendanceReportResult,
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

export const fetchMyToday = async (): Promise<MyTodayResponse | null> => {
  const { data } = await api.get<ApiResponse<MyTodayResponse | null>>("/attendance/my/today");
  return data.data;
};

export const fetchMyAttendance = async (
  params: MyAttendanceParams = {},
): Promise<PaginatedResponse<AttendanceRecord>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<AttendanceRecord>>>(
    "/attendance/my",
    { params },
  );
  return data.data;
};

export const fetchAttendanceReport = async (
  params: AttendanceReportParams,
): Promise<AttendanceReportResult> => {
  const { data } = await api.get<ApiResponse<AttendanceReportResult>>(
    "/attendance/report",
    { params },
  );
  return data.data;
};
