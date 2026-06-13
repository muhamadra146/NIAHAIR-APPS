import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { InventoryBalance, StockMovement, InventoryListParams, MovementListParams } from "./types";

interface InventoryListData {
  data: InventoryBalance[];
  meta: PaginatedResponse<InventoryBalance>["meta"];
}

interface MovementListData {
  data: StockMovement[];
  meta: PaginatedResponse<StockMovement>["meta"];
}

export async function fetchInventories(params: InventoryListParams = {}): Promise<InventoryListData> {
  const { data } = await api.get<ApiResponse<InventoryListData>>("/inventory", { params });
  return data.data;
}

export async function fetchStockMovements(params: MovementListParams = {}): Promise<MovementListData> {
  const { data } = await api.get<ApiResponse<MovementListData>>("/inventory/movements", { params });
  return data.data;
}
