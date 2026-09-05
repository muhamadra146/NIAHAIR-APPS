import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { LeaveQuota, AssignQuotaInput, LeaveQuotaParams } from "../types";

export const fetchLeaveQuotas = async (params: LeaveQuotaParams = {}): Promise<LeaveQuota[]> => {
  const res = await api.get<ApiResponse<PaginatedResponse<LeaveQuota>>>("/leave-quotas", {
    params: { limit: 100, ...params },
  });
  return res.data.data.data;
};

export const fetchMyLeaveQuotas = async (year?: number): Promise<LeaveQuota[]> => {
  const res = await api.get<ApiResponse<PaginatedResponse<LeaveQuota>>>("/leave-quotas/my", {
    params: { limit: 100, ...(year ? { year } : {}) },
  });
  return res.data.data.data;
};

export const assignLeaveQuota = async (input: AssignQuotaInput): Promise<LeaveQuota> => {
  const res = await api.post<ApiResponse<LeaveQuota>>("/leave-quotas", input);
  return res.data.data;
};
