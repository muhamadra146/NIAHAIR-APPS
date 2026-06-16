import { api } from "@/lib/axios";
import type {
  SickLeave, CreateSickLeaveInput, ReviewSickLeaveInput, SickLeaveListParams,
} from "../types";

interface ApiResponse<T> { success: boolean; data: T; message: string }
interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export const fetchSickLeaves = async (params: SickLeaveListParams = {}): Promise<PaginatedResponse<SickLeave>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<SickLeave>>>("/sick-leaves", { params });
  return res.data.data;
};

export const fetchMySickLeaves = async (params: SickLeaveListParams = {}): Promise<PaginatedResponse<SickLeave>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<SickLeave>>>("/sick-leaves/my", { params });
  return res.data.data;
};

export const createSickLeave = async (input: CreateSickLeaveInput): Promise<SickLeave> => {
  const res = await api.post<ApiResponse<SickLeave>>("/sick-leaves", input);
  return res.data.data;
};

export const approveSickLeave = async (id: string, input: ReviewSickLeaveInput = {}): Promise<SickLeave> => {
  const res = await api.post<ApiResponse<SickLeave>>(`/sick-leaves/${id}/approve`, input);
  return res.data.data;
};

export const rejectSickLeave = async (id: string, input: ReviewSickLeaveInput = {}): Promise<SickLeave> => {
  const res = await api.post<ApiResponse<SickLeave>>(`/sick-leaves/${id}/reject`, input);
  return res.data.data;
};

export const cancelSickLeave = async (id: string): Promise<SickLeave> => {
  const res = await api.delete<ApiResponse<SickLeave>>(`/sick-leaves/${id}`);
  return res.data.data;
};

export const uploadSickLeaveDocument = async (id: string, file: File): Promise<SickLeave> => {
  const form = new FormData();
  form.append("document", file);
  const res = await api.post<ApiResponse<SickLeave>>(`/sick-leaves/${id}/document`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};
