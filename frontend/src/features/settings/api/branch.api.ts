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
