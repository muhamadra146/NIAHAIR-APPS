import { api } from "@/lib/axios";
import type { LeaveType, CreateLeaveTypeInput, UpdateLeaveTypeInput } from "../types";

interface ApiResponse<T> { success: boolean; data: T; message: string }

export const fetchLeaveTypes = async (includeInactive = false): Promise<LeaveType[]> => {
  const res = await api.get<ApiResponse<LeaveType[]>>("/leave-types", {
    params: includeInactive ? { includeInactive: "true" } : {},
  });
  return res.data.data;
};

export const createLeaveType = async (input: CreateLeaveTypeInput): Promise<LeaveType> => {
  const res = await api.post<ApiResponse<LeaveType>>("/leave-types", input);
  return res.data.data;
};

export const updateLeaveType = async (id: string, input: UpdateLeaveTypeInput): Promise<LeaveType> => {
  const res = await api.patch<ApiResponse<LeaveType>>(`/leave-types/${id}`, input);
  return res.data.data;
};
