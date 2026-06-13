import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Commission, CommissionListParams } from "./types";

interface CommissionListData {
  data: Commission[];
  meta: PaginatedResponse<Commission>["meta"];
}

export async function fetchCommissions(params: CommissionListParams = {}): Promise<CommissionListData> {
  const { data } = await api.get<ApiResponse<CommissionListData>>("/commissions", { params });
  return data.data;
}

export async function fetchCommission(id: string): Promise<Commission> {
  const { data } = await api.get<ApiResponse<Commission>>(`/commissions/${id}`);
  return data.data;
}

export async function approveCommission(id: string): Promise<Commission> {
  const { data } = await api.patch<ApiResponse<Commission>>(`/commissions/${id}/approve`);
  return data.data;
}

export async function payCommission(id: string): Promise<Commission> {
  const { data } = await api.patch<ApiResponse<Commission>>(`/commissions/${id}/pay`);
  return data.data;
}
