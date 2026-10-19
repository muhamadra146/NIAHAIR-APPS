import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchProductionOrders, fetchProductionOrder, fetchProductionStats,
  createProductionOrder, updateProductionStatus, submitProductionQC, deleteProductionOrder,
  syncProductionToAccurate,
} from "./api";
import type { CreateProductionInput, UpdateStatusInput, SubmitQCInput, ProductionListParams } from "./types";
import { PRODUCTION_STATUS_LABEL } from "./types";

// Sync Accurate produksi berjalan otomatis (latar belakang) setelah COMPLETED. Selama ~2 menit
// setelah dokumen berubah dan belum tersinkron, data dimuat ulang tiap 5 detik agar badge sync
// ikut berubah tanpa refresh manual.
const SYNC_POLL_WINDOW_MS = 2 * 60 * 1000;
function productionAwaitingSync(o: { status: string; updatedAt: string; accuratePenyelesaianId?: number | null }): boolean {
  return o.status === "COMPLETED" && !o.accuratePenyelesaianId
    && Date.now() - new Date(o.updatedAt).getTime() < SYNC_POLL_WINDOW_MS;
}

export function useProductionOrders(params: ProductionListParams = {}) {
  return useQuery({
    queryKey:       ["production-orders", params],
    queryFn:        () => fetchProductionOrders(params),
    staleTime:      0,
    refetchOnMount: true,
    refetchInterval: (query) => (query.state.data?.data?.some(productionAwaitingSync) ? 5000 : false),
  });
}

export function useProductionOrder(id: string) {
  return useQuery({
    queryKey:  ["production-order", id],
    queryFn:   () => fetchProductionOrder(id),
    staleTime: 0,
    enabled:   !!id,
    refetchInterval: (query) => (query.state.data && productionAwaitingSync(query.state.data) ? 5000 : false),
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
      toast.success(`Status diperbarui ke ${PRODUCTION_STATUS_LABEL[data.status] ?? data.status}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSubmitProductionQC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubmitQCInput }) =>
      submitProductionQC(id, input),
    onSuccess: (_data, { id, input }) => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-order", id] });  // ← fix: refresh detail
      qc.invalidateQueries({ queryKey: ["production-stats"] });
      toast.success(`QC ${input.status} berhasil disimpan`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSyncProductionToAccurate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncProductionToAccurate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      qc.invalidateQueries({ queryKey: ["production-order", data.id] });
      toast.success("Production order berhasil disinkronkan ke Accurate");
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
