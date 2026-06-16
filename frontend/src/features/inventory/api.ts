import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  InventoryBalance, StockMovement, InventoryListParams, MovementListParams,
  StockTransfer, CreateTransferInput, TransferListParams,
} from "./types";

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

interface TransferListData {
  data: StockTransfer[];
  meta: PaginatedResponse<StockTransfer>["meta"];
}

export async function fetchStockTransfers(params: TransferListParams = {}): Promise<TransferListData> {
  const { data } = await api.get<ApiResponse<TransferListData>>("/stock-transfers", { params });
  return data.data;
}

export async function fetchStockTransfer(id: string): Promise<StockTransfer> {
  const { data } = await api.get<ApiResponse<StockTransfer>>(`/stock-transfers/${id}`);
  return data.data;
}

export async function createStockTransfer(input: CreateTransferInput): Promise<StockTransfer> {
  const { data } = await api.post<ApiResponse<StockTransfer>>("/stock-transfers", input);
  return data.data;
}

export async function updateTransferStatus(id: string, status: string): Promise<StockTransfer> {
  const { data } = await api.patch<ApiResponse<StockTransfer>>(`/stock-transfers/${id}/status`, { status });
  return data.data;
}
