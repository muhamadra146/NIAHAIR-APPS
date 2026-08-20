import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { fetchComplaintStats, fetchComplaints, fetchComplaint, createComplaint, updateComplaint, deleteComplaint } from "./api";
import type { ComplaintListParams, CreateComplaintInput, UpdateComplaintInput } from "./types";

export function useComplaintStats(branchId?: string) {
  return useQuery({
    queryKey:  ["complaint-stats", branchId],
    queryFn:   () => fetchComplaintStats({ branchId }),
    staleTime: 30_000,
  });
}

export function useComplaints(params: ComplaintListParams = {}) {
  return useQuery({
    queryKey:       ["complaints", params],
    queryFn:        () => fetchComplaints(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: ["complaints", id],
    queryFn:  () => fetchComplaint(id),
    enabled:  !!id,
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintInput) => createComplaint(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Komplain berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateComplaintInput) =>
      updateComplaint(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Komplain berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComplaint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Komplain berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
