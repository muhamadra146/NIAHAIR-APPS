import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInventories, fetchStockMovements,
  fetchStockTransfers, createStockTransfer, updateTransferStatus,
  fetchItemCategories,
} from "./api";
import type { InventoryListParams, MovementListParams, TransferListParams, CreateTransferInput } from "./types";

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
    mutationFn: ({ id, status, branchId }: { id: string; status: string; branchId?: string | null }) => updateTransferStatus(id, status, branchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-transfers"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
