import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchCommissions,
  fetchCommission,
  approveCommission,
  payCommission,
} from "./api";
import type { CommissionListParams } from "./types";

export function useCommissions(params: CommissionListParams = {}) {
  return useQuery({
    queryKey: ["commissions", params],
    queryFn:  () => fetchCommissions(params),
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
