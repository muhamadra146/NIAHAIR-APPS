import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchLeaves, fetchMyLeaves, fetchLeave,
  createLeave, approveLeave, rejectLeave, cancelLeave,
  cancelApprovedLeave, fetchLeaveWorkingDays,
} from "../api/leave.api";
import type { LeaveListParams, CreateLeaveInput } from "../types";

// enabled=false untuk role tanpa akses endpoint daftar semua cuti (khusus penyetuju)
export const useLeaves = (params: LeaveListParams = {}, enabled = true) =>
  useQuery({
    queryKey: ["leaves", params],
    queryFn:  () => fetchLeaves(params),
    enabled,
  });

export const useMyLeaves = (params: Omit<LeaveListParams, "employeeId" | "branchId"> = {}, enabled = true) =>
  useQuery({
    queryKey: ["myLeaves", params],
    queryFn:  () => fetchMyLeaves(params),
    enabled,
  });

/** Pratinjau "N hari kerja" untuk form pengajuan cuti */
export const useLeaveWorkingDays = (startDate: string, endDate: string, enabled = true) =>
  useQuery({
    queryKey: ["leaveWorkingDays", startDate, endDate],
    queryFn:  () => fetchLeaveWorkingDays({ startDate, endDate }),
    enabled:  enabled && !!startDate && !!endDate && endDate >= startDate,
    retry:    false,
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
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leaveQuotas"] }); // sisa jatah (menunggu persetujuan)
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
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaveQuotas"] });
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["my-schedules"] });
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
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaveQuotas"] });
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
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leaveQuotas"] });
      toast.success("Pengajuan cuti dibatalkan");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal membatalkan cuti"),
  });
};

/** Penyetuju membatalkan cuti yang sudah disetujui (jatah dikembalikan, jadwal dipulihkan) */
export const useCancelApprovedLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelApprovedLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["myLeaves"] });
      qc.invalidateQueries({ queryKey: ["leaveQuotas"] });
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["my-schedules"] });
      toast.success("Cuti dibatalkan — jatah dikembalikan dan jadwal dipulihkan");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Gagal membatalkan cuti"),
  });
};
