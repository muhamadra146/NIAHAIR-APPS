import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  InventoryBalance, StockMovement, InventoryListParams, MovementListParams,
  StockTransfer, CreateTransferInput, TransferListParams, ItemCategory,
  CreateStockAdjustmentInput, StockAdjustmentResult, GlAccount,
  CreateBatchStockAdjustmentInput, BatchStockAdjustmentResult,
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

export async function updateTransferStatus(
  id: string,
  status: string,
  branchId?: string | null,
  receivedItems?: { itemId: string; receivedQty: number }[],
): Promise<StockTransfer> {
  const { data } = await api.patch<ApiResponse<StockTransfer>>(`/stock-transfers/${id}/status`, {
    status,
    ...(branchId        ? { branchId }        : {}),
    ...(receivedItems   ? { receivedItems }    : {}),
  });
  return data.data;
}

export async function fetchItemCategories(): Promise<ItemCategory[]> {
  const { data } = await api.get<ApiResponse<{ data: ItemCategory[] }>>("/item-categories", {
    params: { limit: 100 },
  });
  return data.data.data;
}

export async function createStockAdjustment(
  inventoryId: string,
  input: CreateStockAdjustmentInput,
): Promise<StockAdjustmentResult> {
  const { data } = await api.post<ApiResponse<StockAdjustmentResult>>(
    `/inventory/${inventoryId}/adjust`,
    input,
  );
  return data.data;
}

export async function createBatchStockAdjustment(
  input: CreateBatchStockAdjustmentInput,
): Promise<BatchStockAdjustmentResult> {
  const { data } = await api.post<ApiResponse<BatchStockAdjustmentResult>>(
    "/inventory/adjust-batch",
    input,
  );
  return data.data;
}

export async function fetchGlAccounts(params?: { category?: string; usage?: string }): Promise<GlAccount[]> {
  const { data } = await api.get<ApiResponse<{ data: GlAccount[]; meta: unknown }>>("/gl-accounts", {
    params: { limit: 100, ...(params ?? {}) },
  });
  return data.data.data;
}

export async function updateGlAccountUsage(id: string, usage: string | null): Promise<GlAccount> {
  const { data } = await api.patch<ApiResponse<GlAccount>>(`/gl-accounts/${id}/usage`, { usage });
  return data.data;
}

export async function syncGlAccounts(): Promise<{ synced: number }> {
  const { data } = await api.post<ApiResponse<{ synced: number }>>("/gl-accounts/sync/accurate");
  return data.data;
}

export async function deleteStockTransfer(id: string): Promise<{ deleted?: boolean; cancelled?: boolean }> {
  const { data } = await api.delete<ApiResponse<{ deleted?: boolean; cancelled?: boolean }>>(`/stock-transfers/${id}`);
  return data.data;
}

export async function undoTransferReceive(id: string): Promise<StockTransfer> {
  const { data } = await api.patch<ApiResponse<StockTransfer>>(`/stock-transfers/${id}/undo-receive`);
  return data.data;
}
