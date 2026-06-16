import { api } from "@/lib/axios";
import type {
  CorrectionRequest, CreateCorrectionInput, ReviewCorrectionInput, CorrectionListParams,
} from "../types";

interface ApiResponse<T> { success: boolean; data: T; message: string }
interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export const fetchCorrections = async (params: CorrectionListParams = {}): Promise<PaginatedResponse<CorrectionRequest>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<CorrectionRequest>>>("/attendance-corrections", { params });
  return res.data.data;
};

export const fetchMyCorrections = async (params: CorrectionListParams = {}): Promise<PaginatedResponse<CorrectionRequest>> => {
  const res = await api.get<ApiResponse<PaginatedResponse<CorrectionRequest>>>("/attendance-corrections/my", { params });
  return res.data.data;
};

export const createCorrection = async (input: CreateCorrectionInput): Promise<CorrectionRequest> => {
  const res = await api.post<ApiResponse<CorrectionRequest>>("/attendance-corrections", input);
  return res.data.data;
};

export const reviewCorrection = async (id: string, input: ReviewCorrectionInput): Promise<CorrectionRequest> => {
  const res = await api.patch<ApiResponse<CorrectionRequest>>(`/attendance-corrections/${id}/review`, input);
  return res.data.data;
};
