import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Warehouse, WarehouseListParams, UpdateWarehouseBranchInput, UpdateWarehouseAccurateInput } from "../types";

export const fetchWarehouses = async (params: WarehouseListParams = {}): Promise<PaginatedResponse<Warehouse>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Warehouse>>>("/warehouses", { params });
  return data.data;
};

export const syncWarehouses = async (): Promise<{ created: number; updated: number }> => {
  const { data } = await api.post<ApiResponse<{ created: number; updated: number }>>("/warehouses/sync/accurate");
  return data.data;
};

export const updateWarehouseBranch = async (id: string, input: UpdateWarehouseBranchInput): Promise<Warehouse> => {
  const { data } = await api.put<ApiResponse<Warehouse>>(`/warehouses/${id}/branch`, input);
  return data.data;
};

export const updateWarehouseAccurate = async (id: string, input: UpdateWarehouseAccurateInput): Promise<Warehouse> => {
  const { data } = await api.put<ApiResponse<Warehouse>>(`/warehouses/${id}/accurate-mapping`, input);
  return data.data;
};
