import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchProductionOrders, fetchProductionOrder, fetchProductionStats,
  createProductionOrder, updateProductionStatus, submitProductionQC, deleteProductionOrder,
} from "./api";
import type { CreateProductionInput, UpdateStatusInput, SubmitQCInput, ProductionListParams } from "./types";

export function useProductionOrders(params: ProductionListParams = {}) {
  return useQuery({
    queryKey:       ["production-orders", params],
    queryFn:        () => fetchProductionOrders(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useProductionOrder(id: string) {
  return useQuery({
    queryKey:  ["production-order", id],
    queryFn:   () => fetchProductionOrder(id),
    staleTime: 0,
    enabled:   !!id,
  });
}

export function useProductionStats(params?: { branchId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["production-stats", params],
    queryFn:  () => fetchProductionStats(params),
    staleTime: 60 * 1000,
  });
}

export function useCreateProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductionInput) => createProductionOrder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-stats"] });
      toast.success("Production order berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateProductionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStatusInput }) =>
      updateProductionStatus(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-order", data.id] });
      qc.invalidateQueries({ queryKey: ["production-stats"] });
      qc.invalidateQueries({ queryKey: ["inventories"] });
      toast.success(`Status diperbarui ke ${data.status}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSubmitProductionQC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubmitQCInput }) =>
      submitProductionQC(id, input),
    onSuccess: (_data, { input }) => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-stats"] });
      toast.success(`QC ${input.status} berhasil disubmit`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductionOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-stats"] });
      toast.success("Production order berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
