import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  InventoryBalance, StockMovement, InventoryListParams, MovementListParams,
  StockTransfer, CreateTransferInput, TransferListParams, ItemCategory,
  CreateStockAdjustmentInput, StockAdjustmentResult, GlAccount,
  CreateBatchStockAdjustmentInput, BatchStockAdjustmentResult,
  InventoryPeriod,
  StockOpname, CreateOpnameInput, UpdateOpnameItemInput, StockOpnameListParams,
  CreateOpeningBalanceInput, OpeningBalanceResult,
  LowStockItem, ValuationReport,
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

export async function syncStockTransferToAccurate(id: string): Promise<StockTransfer> {
  const { data } = await api.post<ApiResponse<StockTransfer>>(`/stock-transfers/${id}/sync`);
  return data.data;
}

// ── Inventory Period (Stock Opname) ───────────────────────────────────────────

export async function fetchInventoryPeriods(): Promise<InventoryPeriod[]> {
  const { data } = await api.get<ApiResponse<InventoryPeriod[]>>("/inventory/periods");
  return data.data;
}

export async function closePeriod(year: number, month: number): Promise<InventoryPeriod> {
  const { data } = await api.post<ApiResponse<InventoryPeriod>>("/inventory/periods/close", { year, month });
  return data.data;
}

export async function reopenPeriod(year: number, month: number): Promise<InventoryPeriod> {
  const { data } = await api.post<ApiResponse<InventoryPeriod>>("/inventory/periods/reopen", { year, month });
  return data.data;
}

// ── GAP 1: Stock Opname ───────────────────────────────────────────────────────

interface StockOpnameListData {
  data: StockOpname[];
  meta: PaginatedResponse<StockOpname>["meta"];
}

export async function fetchStockOpnames(params: StockOpnameListParams = {}): Promise<StockOpnameListData> {
  const { data } = await api.get<ApiResponse<StockOpnameListData>>("/stock-opnames", { params });
  return data.data;
}

export async function fetchStockOpname(id: string): Promise<StockOpname> {
  const { data } = await api.get<ApiResponse<StockOpname>>(`/stock-opnames/${id}`);
  return data.data;
}

export async function createStockOpname(input: CreateOpnameInput): Promise<StockOpname> {
  const { data } = await api.post<ApiResponse<StockOpname>>("/stock-opnames", input);
  return data.data;
}

export async function updateOpnameItems(
  opnameId: string,
  items: UpdateOpnameItemInput[],
): Promise<StockOpname> {
  const { data } = await api.patch<ApiResponse<StockOpname>>(`/stock-opnames/${opnameId}/items`, { items });
  return data.data;
}

export async function postStockOpname(opnameId: string): Promise<StockOpname> {
  const { data } = await api.post<ApiResponse<StockOpname>>(`/stock-opnames/${opnameId}/post`);
  return data.data;
}

export async function cancelStockOpname(opnameId: string): Promise<StockOpname> {
  const { data } = await api.post<ApiResponse<StockOpname>>(`/stock-opnames/${opnameId}/cancel`);
  return data.data;
}

export async function deleteStockOpname(opnameId: string): Promise<{ deleted: boolean; opnameNo: string }> {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean; opnameNo: string }>>(`/stock-opnames/${opnameId}`);
  return data.data;
}

export async function syncStockOpnameToAccurate(opnameId: string): Promise<StockOpname> {
  const { data } = await api.post<ApiResponse<StockOpname>>(`/stock-opnames/${opnameId}/sync`);
  return data.data;
}

// ── GAP 2: Opening Balance ────────────────────────────────────────────────────

export async function createOpeningBalance(input: CreateOpeningBalanceInput): Promise<OpeningBalanceResult> {
  const { data } = await api.post<ApiResponse<OpeningBalanceResult>>("/inventory/opening-balance", input);
  return data.data;
}

// ── GAP 3: Low Stock & Min Stock ─────────────────────────────────────────────

export async function fetchLowStock(params?: { warehouseId?: string; branchId?: string }): Promise<LowStockItem[]> {
  const { data } = await api.get<ApiResponse<LowStockItem[]>>("/inventory/low-stock", { params });
  return data.data;
}

export async function updateMinStock(inventoryId: string, minStock: number | null): Promise<InventoryBalance> {
  const { data } = await api.put<ApiResponse<InventoryBalance>>(`/inventory/${inventoryId}/min-stock`, { minStock });
  return data.data;
}

// ── GAP 6: Inventory Valuation ────────────────────────────────────────────────

export async function fetchValuation(params?: { warehouseId?: string; branchId?: string }): Promise<ValuationReport> {
  const { data } = await api.get<ApiResponse<ValuationReport>>("/inventory/valuation", { params });
  return data.data;
}

// ── Item master search (untuk Opening Balance — cari dari master, bukan inventory) ──

export interface ItemMaster {
  id:          string;
  name:        string;
  itemCode:    string | null;
  itemType:    string;
  defaultUnit: { id: string; name: string } | null;
}

export async function fetchItems(params: { search?: string; itemType?: string; limit?: number } = {}): Promise<ItemMaster[]> {
  const { data } = await api.get<ApiResponse<{ data: ItemMaster[] }>>("/items", { params });
  return data.data.data ?? [];
}
