import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchCommissions,
  fetchCommission,
  approveCommission,
  payCommission,
  overrideCommission,
  regenerateCommission,
  deleteCommission,
} from "./api";
import type { CommissionListParams } from "./types";

export function useCommissions(params: CommissionListParams = {}) {
  return useQuery({
    queryKey:       ["commissions", params],
    queryFn:        () => fetchCommissions(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useCommission(id: string) {
  return useQuery({
    queryKey: ["commissions", id],
    queryFn:  () => fetchCommission(id),
    enabled:  !!id,
  });
}

export function useApproveCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveCommission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Komisi disetujui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePayCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payCommission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Komisi ditandai dibayar");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useOverrideCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { commissionAmount: number; notes?: string } }) =>
      overrideCommission(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Komisi diubah manual");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCommission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Komisi dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRegenerateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => regenerateCommission(invoiceId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast.success(`${result.created} komisi dibuat ulang`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
