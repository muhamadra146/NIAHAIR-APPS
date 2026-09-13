import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  ProductionOrder, ProductionStats,
  CreateProductionInput, UpdateStatusInput, SubmitQCInput,
  ProductionListParams,
} from "./types";

interface ProductionListData {
  data: ProductionOrder[];
  meta: PaginatedResponse<ProductionOrder>["meta"];
}

export async function fetchProductionOrders(params: ProductionListParams = {}): Promise<ProductionListData> {
  const { data } = await api.get<ApiResponse<ProductionListData>>("/production-orders", { params });
  return data.data;
}

export async function fetchProductionOrder(id: string): Promise<ProductionOrder> {
  const { data } = await api.get<ApiResponse<ProductionOrder>>(`/production-orders/${id}`);
  return data.data;
}

export async function fetchProductionStats(params?: { branchId?: string; startDate?: string; endDate?: string }): Promise<ProductionStats> {
  const { data } = await api.get<ApiResponse<ProductionStats>>("/production-orders/stats", { params });
  return data.data;
}

export async function createProductionOrder(input: CreateProductionInput): Promise<ProductionOrder> {
  const { data } = await api.post<ApiResponse<ProductionOrder>>("/production-orders", input);
  return data.data;
}

export async function updateProductionStatus(id: string, input: UpdateStatusInput): Promise<ProductionOrder> {
  const { data } = await api.patch<ApiResponse<ProductionOrder>>(`/production-orders/${id}/status`, input);
  return data.data;
}

export async function submitProductionQC(id: string, input: SubmitQCInput): Promise<{ qcRecord: unknown; order: ProductionOrder }> {
  const { data } = await api.post<ApiResponse<{ qcRecord: unknown; order: ProductionOrder }>>(`/production-orders/${id}/qc`, input);
  return data.data;
}

export async function deleteProductionOrder(id: string): Promise<{ deleted: boolean }> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/production-orders/${id}`);
  return data.data;
}

export async function syncProductionToAccurate(id: string): Promise<ProductionOrder> {
  const { data } = await api.post<ApiResponse<ProductionOrder>>(`/production-orders/${id}/sync`);
  return data.data;
}
