import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchEmployees,
  fetchEmployee,
  createEmployee,
  updateEmployee,
  fetchEmployeeRoles,
  fetchSalarySettings,
  fetchActiveSalarySetting,
  createSalarySetting,
  updateSalarySetting,
} from "./api";
import type {
  EmployeeListParams,
  CreateEmployeeInput,
  UpdateEmployeeInput,
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

// ── Salary settings ───────────────────────────────────────────────────────────

export function useSalarySettings(employeeId: string) {
  return useQuery({
    queryKey: ["salary-settings", employeeId],
    queryFn:  () => fetchSalarySettings(employeeId),
    enabled:  !!employeeId,
  });
}

export function useActiveSalarySetting(employeeId: string) {
  return useQuery({
    queryKey: ["salary-settings", employeeId, "active"],
    queryFn:  () => fetchActiveSalarySetting(employeeId),
    enabled:  !!employeeId,
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
