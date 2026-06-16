import { api } from "@/lib/axios";
import type { LeaveQuota, AssignQuotaInput, LeaveQuotaParams } from "../types";

interface ApiResponse<T> { success: boolean; data: T; message: string }

export const fetchLeaveQuotas = async (params: LeaveQuotaParams = {}): Promise<LeaveQuota[]> => {
  const res = await api.get<ApiResponse<LeaveQuota[]>>("/leave-quotas", { params });
  return res.data.data;
};

export const fetchMyLeaveQuotas = async (year?: number): Promise<LeaveQuota[]> => {
  const res = await api.get<ApiResponse<LeaveQuota[]>>("/leave-quotas/my", { params: year ? { year } : {} });
  return res.data.data;
};

export const assignLeaveQuota = async (input: AssignQuotaInput): Promise<LeaveQuota> => {
  const res = await api.post<ApiResponse<LeaveQuota>>("/leave-quotas", input);
  return res.data.data;
};
