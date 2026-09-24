import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchConsultationNotes,
  fetchUnfilledInvoices,
  fetchConsultationNote,
  fetchConsultationNoteByInvoice,
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  fetchConsultationStats,
} from "./api";
import type {
  ConsultationNoteListParams,
  UnfilledInvoiceListParams,
  CreateConsultationNoteInput,
  UpdateConsultationNoteInput,
} from "./types";

export function useConsultationNotes(
  params: ConsultationNoteListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["consultation-notes", "list", params],
    queryFn:  () => fetchConsultationNotes(params),
    enabled:  options?.enabled ?? true,
  });
}

export function useUnfilledInvoices(
  params: UnfilledInvoiceListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["consultation-notes", "unfilled", params],
    queryFn:  () => fetchUnfilledInvoices(params),
    enabled:  options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useConsultationNote(id: string) {
  return useQuery({
    queryKey: ["consultation-notes", id],
    queryFn:  () => fetchConsultationNote(id),
    enabled:  !!id,
  });
}

export function useConsultationNoteByInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["consultation-notes", "invoice", invoiceId],
    queryFn:  () => fetchConsultationNoteByInvoice(invoiceId),
    enabled:  !!invoiceId,
  });
}

export function useCreateConsultationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConsultationNoteInput) => createConsultationNote(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation-notes"] });
      toast.success("Catatan klien berhasil disimpan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateConsultationNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConsultationNoteInput) => updateConsultationNote(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation-notes"] });
      toast.success("Catatan klien berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteConsultationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConsultationNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation-notes"] });
      toast.success("Catatan berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useConsultationStats(
  params: { branchId?: string; startDate?: string; endDate?: string; month?: number; year?: number } = {},
) {
  return useQuery({
    queryKey: ["consultation-notes", "stats", params],
    queryFn:  () => fetchConsultationStats(params),
  });
}
