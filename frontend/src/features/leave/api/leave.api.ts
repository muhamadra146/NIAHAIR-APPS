import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Leave, LeaveListParams, CreateLeaveInput, LeaveWorkingDays } from "../types";

type LeaveListResult = { data: Leave[]; meta: PaginatedResponse<Leave>["meta"] };

export const fetchLeaves = async (params: LeaveListParams = {}): Promise<LeaveListResult> => {
  const { data } = await api.get<ApiResponse<LeaveListResult>>("/leaves", { params });
  return data.data;
};

export const fetchMyLeaves = async (params: Omit<LeaveListParams, "employeeId" | "branchId"> = {}): Promise<LeaveListResult> => {
  const { data } = await api.get<ApiResponse<LeaveListResult>>("/leaves/my", { params });
  return data.data;
};

export const fetchLeave = async (id: string): Promise<Leave> => {
  const { data } = await api.get<ApiResponse<Leave>>(`/leaves/${id}`);
  return data.data;
};

export const createLeave = async (input: CreateLeaveInput): Promise<Leave> => {
  const { data } = await api.post<ApiResponse<Leave>>("/leaves", input);
  return data.data;
};

export const approveLeave = async (id: string): Promise<Leave> => {
  const { data } = await api.post<ApiResponse<Leave>>(`/leaves/${id}/approve`);
  return data.data;
};

export const rejectLeave = async (id: string): Promise<Leave> => {
  const { data } = await api.post<ApiResponse<Leave>>(`/leaves/${id}/reject`);
  return data.data;
};

export const cancelLeave = async (id: string): Promise<Leave> => {
  const { data } = await api.delete<ApiResponse<Leave>>(`/leaves/${id}`);
  return data.data;
};

/** Batalkan cuti yang sudah disetujui (penyetuju; hanya bila belum dimulai) */
export const cancelApprovedLeave = async (id: string): Promise<Leave> => {
  const { data } = await api.post<ApiResponse<Leave>>(`/leaves/${id}/cancel`);
  return data.data;
};

/** Pratinjau durasi cuti dalam hari kerja (OFF & libur nasional tidak dihitung) */
export const fetchLeaveWorkingDays = async (params: { startDate: string; endDate: string }): Promise<LeaveWorkingDays> => {
  const { data } = await api.get<ApiResponse<LeaveWorkingDays>>("/leaves/working-days", { params });
  return data.data;
};
