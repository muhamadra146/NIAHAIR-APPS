import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { LeaveType, CreateLeaveTypeInput, UpdateLeaveTypeInput } from "../types";

export const fetchLeaveTypes = async (includeInactive = false): Promise<LeaveType[]> => {
  const res = await api.get<ApiResponse<PaginatedResponse<LeaveType>>>("/leave-types", {
    params: { limit: 100, ...(includeInactive ? { includeInactive: "true" } : {}) },
  });
  return res.data.data.data;
};

export const createLeaveType = async (input: CreateLeaveTypeInput): Promise<LeaveType> => {
  const res = await api.post<ApiResponse<LeaveType>>("/leave-types", input);
  return res.data.data;
};

export const updateLeaveType = async (id: string, input: UpdateLeaveTypeInput): Promise<LeaveType> => {
  const res = await api.patch<ApiResponse<LeaveType>>(`/leave-types/${id}`, input);
  return res.data.data;
};
