import { api } from "@/lib/axios";
import type {
  PermissionRequest, CreatePermissionInput, ReviewPermissionInput, PermissionListParams,
} from "../types";

interface ApiResponse<T> { success: boolean; data: T; message: string }
interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export const fetchPermissions = async (params: PermissionListParams = {}): Promise<PaginatedResponse<PermissionRequest>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<PermissionRequest>>>("/permissions", { params });
  return res.data.data;
};

export const fetchMyPermissions = async (params: PermissionListParams = {}): Promise<PaginatedResponse<PermissionRequest>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<PermissionRequest>>>("/permissions/my", { params });
  return res.data.data;
};

export const createPermission = async (input: CreatePermissionInput): Promise<PermissionRequest> => {
  const res = await api.post<ApiResponse<PermissionRequest>>("/permissions", input);
  return res.data.data;
};

export const approvePermission = async (id: string, input: ReviewPermissionInput = {}): Promise<PermissionRequest> => {
  const res = await api.post<ApiResponse<PermissionRequest>>(`/permissions/${id}/approve`, input);
  return res.data.data;
};

export const rejectPermission = async (id: string, input: ReviewPermissionInput = {}): Promise<PermissionRequest> => {
  const res = await api.post<ApiResponse<PermissionRequest>>(`/permissions/${id}/reject`, input);
  return res.data.data;
};

export const cancelPermission = async (id: string): Promise<PermissionRequest> => {
  const res = await api.delete<ApiResponse<PermissionRequest>>(`/permissions/${id}`);
  return res.data.data;
};
