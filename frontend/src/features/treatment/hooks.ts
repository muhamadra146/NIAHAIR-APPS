import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchTreatments,
  fetchTreatment,
  createTreatment,
  updateTreatment,
  fetchTreatmentItems,
  createTreatmentItem,
  updateTreatmentItem,
  deleteTreatmentItem,
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  searchItems,
  fetchUnits,
} from "./api";
import type {
  TreatmentListParams,
  CreateTreatmentInput,
  UpdateTreatmentInput,
  CreateTreatmentItemInput,
  UpdateTreatmentItemInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "./types";

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useTreatments(params: TreatmentListParams = {}) {
  return useQuery({
    queryKey: ["treatments", params],
    queryFn:  () => fetchTreatments(params),
  });
}

export function useTreatment(id: string) {
  return useQuery({
    queryKey: ["treatments", id],
    queryFn:  () => fetchTreatment(id),
    enabled:  !!id,
  });
}

export function useCreateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentInput) => createTreatment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
      toast.success("Sesi treatment dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTreatment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTreatmentInput) => updateTreatment(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments", id] });
      toast.success("Treatment diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function useTreatmentItems(sessionId: string) {
  return useQuery({
    queryKey: ["treatment-items", sessionId],
    queryFn:  () => fetchTreatmentItems(sessionId),
    enabled:  !!sessionId,
  });
}

export function useCreateTreatmentItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTreatmentItemInput) => createTreatmentItem(sessionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-items", sessionId] });
      toast.success("Item ditambahkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTreatmentItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateTreatmentItemInput }) =>
      updateTreatmentItem(sessionId, itemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-items", sessionId] });
      toast.success("Item diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTreatmentItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteTreatmentItem(sessionId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatment-items", sessionId] });
      toast.success("Item dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Assignments ───────────────────────────────────────────────────────────────

export function useAssignments(sessionId: string, itemId: string) {
  return useQuery({
    queryKey: ["assignments", sessionId, itemId],
    queryFn:  () => fetchAssignments(sessionId, itemId),
    enabled:  !!sessionId && !!itemId,
  });
}

export function useCreateAssignment(sessionId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => createAssignment(sessionId, itemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", sessionId, itemId] });
      qc.invalidateQueries({ queryKey: ["treatment-items", sessionId] });
      toast.success("Staff ditugaskan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAssignment(sessionId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(sessionId, itemId, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", sessionId, itemId] });
      qc.invalidateQueries({ queryKey: ["treatment-items", sessionId] });
      toast.success("Penugasan dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Helper data ───────────────────────────────────────────────────────────────

export function useItemSearch(search: string) {
  return useQuery({
    queryKey: ["item-search", search],
    queryFn:  () => searchItems(search),
    enabled:  search.length >= 1,
    staleTime: 30_000,
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn:  fetchUnits,
    staleTime: 5 * 60 * 1000,
  });
}
