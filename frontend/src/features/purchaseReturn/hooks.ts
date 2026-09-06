import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchPurchaseReturns,
  fetchPurchaseReturn,
  createPurchaseReturn,
  postPurchaseReturn,
  cancelPurchaseReturn,
  deletePurchaseReturn,
  syncPurchaseReturnToAccurate,
} from "./api";
import type { PurchaseReturnListParams, CreatePurchaseReturnInput } from "./types";

export function usePurchaseReturns(params: PurchaseReturnListParams = {}) {
  return useQuery({
    queryKey:       ["purchase-returns", params],
    queryFn:        () => fetchPurchaseReturns(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function usePurchaseReturn(id: string) {
  return useQuery({
    queryKey: ["purchase-return", id],
    queryFn:  () => fetchPurchaseReturn(id),
    enabled:  !!id,
  });
}

export function useCreatePurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseReturnInput) => createPurchaseReturn(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      toast.success("Retur pembelian berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePostPurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postPurchaseReturn(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      qc.invalidateQueries({ queryKey: ["purchase-return", id] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      toast.success("Retur berhasil di-posting");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelPurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchaseReturn(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      qc.invalidateQueries({ queryKey: ["purchase-return", id] });
      toast.success("Retur berhasil dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeletePurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchaseReturn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      toast.success("Retur berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncPurchaseReturnToAccurate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncPurchaseReturnToAccurate(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-return", id] });
      toast.success("Sinkronisasi ke Accurate berhasil");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
