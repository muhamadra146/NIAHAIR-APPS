import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchEmployees,
  fetchEmployee,
  createEmployee,
  updateEmployee,
  uploadEmployeeFiles,
  deactivateEmployee,
  deleteEmployee,
  updateEmployeeBranches,
  fetchEmployeeRoles,
  fetchNextEmployeeCode,
  fetchSalarySettings,
  fetchActiveSalarySetting,
  createSalarySetting,
  updateSalarySetting,
} from "./api";
import type {
  EmployeeListParams,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UploadEmployeeFilesInput,
  UpdateEmployeeBranchesInput,
  CreateSalarySettingInput,
  UpdateSalarySettingInput,
} from "./types";

// ── Employee list / detail ────────────────────────────────────────────────────

export function useEmployees(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn:  () => fetchEmployees(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn:  () => fetchEmployee(id),
    enabled:  !!id,
  });
}

export function useEmployeeRoles() {
  return useQuery({
    queryKey: ["employee-roles"],
    queryFn:  fetchEmployeeRoles,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNextEmployeeCode() {
  return useQuery({
    queryKey: ["employee-next-code"],
    queryFn:  fetchNextEmployeeCode,
    staleTime: 0,
  });
}

// ── Employee mutations ────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Karyawan berhasil ditambahkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => updateEmployee(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Data karyawan diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUploadEmployeeFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: UploadEmployeeFilesInput }) =>
      uploadEmployeeFiles(id, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Karyawan berhasil dinonaktifkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Karyawan berhasil dihapus permanen");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateEmployeeBranches(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeBranchesInput) => updateEmployeeBranches(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
  });
}

// ── Salary settings ───────────────────────────────────────────────────────────

export function useSalarySettings(employeeId: string) {
  return useQuery({
    queryKey:       ["salary-settings", employeeId],
    queryFn:        () => fetchSalarySettings(employeeId),
    enabled:        !!employeeId,
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useActiveSalarySetting(employeeId: string) {
  return useQuery({
    queryKey:       ["salary-settings", employeeId, "active"],
    queryFn:        () => fetchActiveSalarySetting(employeeId),
    enabled:        !!employeeId,
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useCreateSalarySetting(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalarySettingInput) => createSalarySetting(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-settings", employeeId] });
      toast.success("Setting gaji berhasil disimpan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSalarySetting(employeeId: string, settingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSalarySettingInput) => updateSalarySetting(settingId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-settings", employeeId] });
      toast.success("Setting gaji diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
