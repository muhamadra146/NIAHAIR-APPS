import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchInventories, fetchStockMovements,
  fetchStockTransfers, fetchStockTransfer, createStockTransfer, updateTransferStatus,
  fetchItemCategories, createStockAdjustment, fetchGlAccounts,
  createBatchStockAdjustment, syncGlAccounts,
  deleteStockTransfer, undoTransferReceive, syncStockTransferToAccurate,
  fetchInventoryPeriods, closePeriod, reopenPeriod,
  fetchStockOpnames, fetchStockOpname, createStockOpname, updateOpnameItems, postStockOpname, cancelStockOpname, deleteStockOpname, syncStockOpnameToAccurate,
  createOpeningBalance,
  fetchLowStock, updateMinStock,
  fetchValuation,
  fetchItems,
} from "./api";
import type {
  InventoryListParams, MovementListParams, TransferListParams, CreateTransferInput,
  CreateStockAdjustmentInput, CreateBatchStockAdjustmentInput,
  StockOpnameListParams, CreateOpnameInput, UpdateOpnameItemInput,
  CreateOpeningBalanceInput,
} from "./types";

export function useInventories(params: InventoryListParams = {}) {
  return useQuery({
    queryKey:       ["inventories", params],
    queryFn:        () => fetchInventories(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useItemCategories() {
  return useQuery({
    queryKey: ["item-categories"],
    queryFn:  fetchItemCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovements(params: MovementListParams = {}) {
  return useQuery({
    queryKey:       ["stock-movements", params],
    queryFn:        () => fetchStockMovements(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useStockTransfers(params: TransferListParams = {}) {
  return useQuery({
    queryKey:       ["stock-transfers", params],
    queryFn:        () => fetchStockTransfers(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useStockTransfer(id: string | null | undefined) {
  return useQuery({
    queryKey:  ["stock-transfer", id],
    queryFn:   () => fetchStockTransfer(id!),
    enabled:   !!id,
    staleTime: 0,
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransferInput) => createStockTransfer(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock-transfers"] }); },
  });
}

export function useUpdateTransferStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, status, branchId, receivedItems,
    }: {
      id: string;
      status: string;
      branchId?: string | null;
      receivedItems?: { itemId: string; receivedQty: number }[];
    }) => updateTransferStatus(id, status, branchId, receivedItems),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["stock-transfer", data.id] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useCreateBatchStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchStockAdjustmentInput) => createBatchStockAdjustment(input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      if (result.accurateSynced === result.adjustedCount) {
        toast.success(`${result.adjustedCount} item berhasil disesuaikan & tersinkron ke Accurate`);
      } else if (result.accurateSynced > 0) {
        toast.success(`${result.adjustedCount} item disesuaikan (${result.accurateSynced} sync ke Accurate)`);
      } else {
        toast.success(`${result.adjustedCount} item berhasil disesuaikan`);
        if (result.accurateErrors?.length) {
          toast.error(`Sync Accurate gagal: ${result.accurateErrors[0]}`, { duration: 8000 });
        }
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGlAccounts(params?: { category?: string; usage?: string } | string) {
  const normalized = typeof params === "string" ? { category: params } : params;
  const key = normalized ? JSON.stringify(normalized) : "all";
  return useQuery({
    queryKey:  ["gl-accounts", key],
    queryFn:   () => fetchGlAccounts(normalized),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSyncGlAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncGlAccounts,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["gl-accounts"] });
      toast.success(`${result.synced} akun GL berhasil disinkronkan dari Accurate`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStockTransfer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useUndoTransferReceive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => undoTransferReceive(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["stock-transfer", data.id] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useSyncStockTransferToAccurate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncStockTransferToAccurate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["stock-transfer", data.id] });
    },
  });
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inventoryId, ...input }: { inventoryId: string } & CreateStockAdjustmentInput) =>
      createStockAdjustment(inventoryId, input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      if (result.accurateSynced) {
        toast.success("Penyesuaian stok berhasil disimpan & tersinkron ke Accurate");
      } else if (result.accurateError) {
        toast.success("Penyesuaian stok berhasil disimpan");
        toast.error(`Sync Accurate gagal: ${result.accurateError}`, { duration: 6000 });
      } else {
        toast.success("Penyesuaian stok berhasil disimpan");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Inventory Period (Stock Opname) ───────────────────────────────────────────

export function useInventoryPeriods() {
  return useQuery({
    queryKey: ["inventory-periods"],
    queryFn:  fetchInventoryPeriods,
    staleTime: 60 * 1000,
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => closePeriod(year, month),
    onSuccess: (_data, { year, month }) => {
      qc.invalidateQueries({ queryKey: ["inventory-periods"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      toast.success(`Periode ${String(month).padStart(2, "0")}/${year} berhasil ditutup`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReopenPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => reopenPeriod(year, month),
    onSuccess: (_data, { year, month }) => {
      qc.invalidateQueries({ queryKey: ["inventory-periods"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      toast.success(`Periode ${String(month).padStart(2, "0")}/${year} berhasil dibuka kembali`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── GAP 1: Stock Opname ───────────────────────────────────────────────────────

export function useStockOpnames(params: StockOpnameListParams = {}) {
  return useQuery({
    queryKey:       ["stock-opnames", params],
    queryFn:        () => fetchStockOpnames(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useStockOpname(id: string | null) {
  return useQuery({
    queryKey:  ["stock-opname", id],
    queryFn:   () => fetchStockOpname(id!),
    enabled:   !!id,
    staleTime: 0,
  });
}

export function useCreateStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpnameInput) => createStockOpname(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      toast.success("Opname berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateOpnameItems(opnameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: UpdateOpnameItemInput[]) => updateOpnameItems(opnameId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-opname", opnameId] });
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      toast.success("Item opname berhasil disimpan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePostStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opnameId: string) => postStockOpname(opnameId),
    onSuccess: (opname) => {
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      qc.invalidateQueries({ queryKey: ["stock-opname", opname.id] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success(`Opname ${opname.opnameNo} berhasil diposting`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opnameId: string) => cancelStockOpname(opnameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      toast.success("Opname berhasil dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteStockOpname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opnameId: string) => deleteStockOpname(opnameId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      toast.success(`Opname ${data.opnameNo} berhasil dihapus`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncStockOpnameToAccurate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opnameId: string) => syncStockOpnameToAccurate(opnameId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stock-opnames"] });
      qc.invalidateQueries({ queryKey: ["stock-opname", data.id] });
      toast.success("Opname berhasil disinkronkan ke Accurate");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── GAP 2: Opening Balance ────────────────────────────────────────────────────

export function useCreateOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpeningBalanceInput) => createOpeningBalance(input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success(`Saldo awal dibuat: ${result.created} item (${result.skipped} dilewati karena sudah ada)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── GAP 3: Low Stock & Min Stock ─────────────────────────────────────────────

export function useLowStock(params?: { warehouseId?: string; branchId?: string }) {
  return useQuery({
    queryKey:       ["low-stock", params],
    queryFn:        () => fetchLowStock(params),
    staleTime:      60 * 1000,
    refetchOnMount: true,
  });
}

export function useUpdateMinStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inventoryId, minStock }: { inventoryId: string; minStock: number | null }) =>
      updateMinStock(inventoryId, minStock),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      toast.success("Min stok berhasil disimpan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── GAP 6: Inventory Valuation ────────────────────────────────────────────────

export function useValuation(params?: { warehouseId?: string; branchId?: string }) {
  return useQuery({
    queryKey:       ["inventory-valuation", params],
    queryFn:        () => fetchValuation(params),
    staleTime:      5 * 60 * 1000,
    refetchOnMount: true,
  });
}

// ── Item master search ────────────────────────────────────────────────────────

export function useItems(params: { search?: string; itemType?: string; limit?: number } = {}) {
  return useQuery({
    queryKey:  ["items", params],
    queryFn:   () => fetchItems(params),
    enabled:   (params.search?.length ?? 0) >= 1,
    staleTime: 30 * 1000,
  });
}
