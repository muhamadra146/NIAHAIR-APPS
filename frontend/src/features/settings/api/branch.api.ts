import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Branch, BranchListParams, CreateBranchInput, UpdateBranchInput } from "../types";

export const fetchBranches = async (params: BranchListParams = {}): Promise<PaginatedResponse<Branch>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Branch>>>("/branches", { params });
  return data.data;
};

export const fetchAllBranches = async (): Promise<Branch[]> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Branch>>>("/branches", {
    params: { limit: 100 },
  });
  return data.data.data ?? [];
};

export const createBranch = async (input: CreateBranchInput): Promise<Branch> => {
  const { data } = await api.post<ApiResponse<Branch>>("/branches", input);
  return data.data;
};

export const updateBranch = async (id: string, input: UpdateBranchInput): Promise<Branch> => {
  const { data } = await api.put<ApiResponse<Branch>>(`/branches/${id}`, input);
  return data.data;
};

export const deleteBranch = async (id: string): Promise<void> => {
  await api.delete(`/branches/${id}`);
};

export interface BranchSyncResult {
  total: number;
  matched: number;
  unmatched: number;
  failed: number;
  results: { accurateBranchId: number; name: string; localId?: string; status: string; hint?: string }[];
}

export const syncBranchesFromAccurate = async (): Promise<BranchSyncResult> => {
  const { data } = await api.post<{ data: BranchSyncResult }>("/branches/sync-accurate");
  return data.data;
};

export const mapBranchToAccurate = async (branchId: string, accurateBranchId: number): Promise<Branch> => {
  const { data } = await api.put<ApiResponse<Branch>>(`/branches/${branchId}/accurate-mapping`, { accurateBranchId });
  return data.data;
};
