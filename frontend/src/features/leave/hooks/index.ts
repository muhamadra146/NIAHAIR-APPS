import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchLeaves, fetchMyLeaves, fetchLeave,
  createLeave, approveLeave, rejectLeave, cancelLeave,
} from "../api/leave.api";
import type { LeaveListParams, CreateLeaveInput } from "../types";

export const useLeaves = (params: LeaveListParams = {}) =>
  useQuery({
    queryKey: ["leaves", params],
    queryFn:  () => fetchLeaves(params),
  });

export const useMyLeaves = (params: Omit<LeaveListParams, "employeeId" | "branchId"> = {}) =>
  useQuery({
    queryKey: ["myLeaves", params],
    queryFn:  () => fetchMyLeaves(params),
  });

export const useLeave = (id: string) =>
  useQuery({
    queryKey: ["leaves", id],
    queryFn:  () => fetchLeave(id),
    enabled:  !!id,
  });

export const useCreateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveInput) => createLeave(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Pengajuan cuti berhasil dikirim");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal mengajukan cuti"),
  });
};

export const useApproveLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Cuti disetujui");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal menyetujui cuti"),
  });
};

export const useRejectLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Cuti ditolak");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal menolak cuti"),
  });
};

export const useCancelLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      toast.success("Pengajuan cuti dibatalkan");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal membatalkan cuti"),
  });
};
