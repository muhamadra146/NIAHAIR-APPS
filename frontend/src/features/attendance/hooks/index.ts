import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyAttendanceToday } from "../api/attendance.api";
import {
  fetchCorrections, fetchMyCorrections, createCorrection, reviewCorrection,
} from "../api/correction.api";

export const useMyAttendanceToday = () =>
  useQuery({
    queryKey:       ["attendance", "my", "today"],
    queryFn:        fetchMyAttendanceToday,
    staleTime:      60_000,
    refetchOnMount: true,
  });
import {
  fetchPermissions, fetchMyPermissions, createPermission,
  approvePermission, rejectPermission, cancelPermission,
} from "../api/permission.api";
import {
  fetchSickLeaves, fetchMySickLeaves, createSickLeave,
  approveSickLeave, rejectSickLeave, cancelSickLeave, uploadSickLeaveDocument,
} from "../api/sickLeave.api";
import type {
  CorrectionListParams, CreateCorrectionInput, ReviewCorrectionInput,
  PermissionListParams, CreatePermissionInput, ReviewPermissionInput,
  SickLeaveListParams, CreateSickLeaveInput, ReviewSickLeaveInput,
} from "../types";

// ── Correction hooks ─────────────────────────────────────────────────

// enabled=false untuk role tanpa akses endpoint daftar semua pengajuan (khusus penyetuju)
export const useCorrections = (params: CorrectionListParams = {}, enabled = true) =>
  useQuery({ queryKey: ["corrections", params], queryFn: () => fetchCorrections(params), enabled });

export const useMyCorrections = (params: CorrectionListParams = {}) =>
  useQuery({ queryKey: ["corrections", "my", params], queryFn: () => fetchMyCorrections(params) });

export const useCreateCorrection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCorrectionInput) => createCorrection(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["corrections"] }); },
  });
};

export const useReviewCorrection = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewCorrectionInput) => reviewCorrection(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["corrections"] }); },
  });
};

// ── Permission hooks ─────────────────────────────────────────────────

export const usePermissions = (params: PermissionListParams = {}, enabled = true) =>
  useQuery({ queryKey: ["permissions", params], queryFn: () => fetchPermissions(params), enabled });

export const useMyPermissions = (params: PermissionListParams = {}, enabled = true) =>
  useQuery({ queryKey: ["permissions", "my", params], queryFn: () => fetchMyPermissions(params), enabled });

export const useCreatePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePermissionInput) => createPermission(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissions"] }); },
  });
};

export const useApprovePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ReviewPermissionInput }) =>
      approvePermission(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissions"] }); },
  });
};

export const useRejectPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ReviewPermissionInput }) =>
      rejectPermission(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissions"] }); },
  });
};

export const useCancelPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelPermission(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permissions"] }); },
  });
};

// ── Sick Leave hooks ─────────────────────────────────────────────────

export const useSickLeaves = (params: SickLeaveListParams = {}, enabled = true) =>
  useQuery({ queryKey: ["sick-leaves", params], queryFn: () => fetchSickLeaves(params), enabled });

export const useMySickLeaves = (params: SickLeaveListParams = {}, enabled = true) =>
  useQuery({ queryKey: ["sick-leaves", "my", params], queryFn: () => fetchMySickLeaves(params), enabled });

export const useCreateSickLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSickLeaveInput) => createSickLeave(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sick-leaves"] }); },
  });
};

export const useApproveSickLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ReviewSickLeaveInput }) =>
      approveSickLeave(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sick-leaves"] }); },
  });
};

export const useRejectSickLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ReviewSickLeaveInput }) =>
      rejectSickLeave(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sick-leaves"] }); },
  });
};

export const useCancelSickLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSickLeave(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sick-leaves"] }); },
  });
};

export const useUploadSickLeaveDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadSickLeaveDocument(id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sick-leaves"] }); },
  });
};
