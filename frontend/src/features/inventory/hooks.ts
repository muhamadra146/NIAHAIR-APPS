import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchInventories, fetchStockMovements,
  fetchStockTransfers, createStockTransfer, updateTransferStatus,
  fetchItemCategories, createStockAdjustment, fetchGlAccounts,
  createBatchStockAdjustment, syncGlAccounts,
  deleteStockTransfer, undoTransferReceive,
  fetchInventoryPeriods, closePeriod, reopenPeriod,
} from "./api";
import type { InventoryListParams, MovementListParams, TransferListParams, CreateTransferInput, CreateStockAdjustmentInput, CreateBatchStockAdjustmentInput } from "./types";

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
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
