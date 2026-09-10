import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchSuppliers, fetchPurchaseInvoices, fetchPurchaseInvoice,
  createPurchaseInvoice, updatePurchaseInvoice,
  cancelPurchaseInvoice, deletePurchaseInvoice, syncSuppliers,
} from "./api";
import type { PurchaseListParams, CreatePurchaseInvoiceInput } from "./types";

export function useSuppliers() {
  return useQuery({
    queryKey:  ["suppliers"],
    queryFn:   fetchSuppliers,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePurchaseInvoices(params: PurchaseListParams = {}) {
  return useQuery({
    queryKey:        ["purchase-invoices", params],
    queryFn:         () => fetchPurchaseInvoices(params),
    staleTime:       0,
    refetchOnMount:  true,
    // Auto-poll every 5s while any POSTED invoice is pending Accurate sync
    refetchInterval: (query) =>
      query.state.data?.data?.some(
        (inv: any) => inv.status === "POSTED" && !inv.accuratePurchaseInvoiceId
      )
        ? 5000
        : false,
  });
}

export function usePurchaseInvoice(id: string) {
  return useQuery({
    queryKey: ["purchase-invoice", id],
    queryFn:  () => fetchPurchaseInvoice(id),
    enabled:  !!id,
  });
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseInvoiceInput) => createPurchaseInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Faktur pembelian berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreatePurchaseInvoiceInput>) =>
      updatePurchaseInvoice(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoice", vars.id] });
      toast.success("Faktur pembelian berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPurchaseInvoice(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoice", id] }); // B8: update status badge di detail page
      qc.invalidateQueries({ queryKey: ["inventories"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Faktur pembelian berhasil dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeletePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchaseInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });    // B9: stok berubah saat delete POSTED
      qc.invalidateQueries({ queryKey: ["stock-movements"] }); // B9: mutasi berubah
      toast.success("Faktur pembelian berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncSuppliers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncSuppliers,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      const msg = `Supplier sync: ${result.created} baru, ${result.updated} diperbarui`;
      if (result.failed > 0) {
        toast.error(`${msg}, ${result.failed} gagal`);
      } else {
        toast.success(msg);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
