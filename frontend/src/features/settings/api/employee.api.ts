import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Employee,
  EmployeeListParams,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateEmployeeBranchesInput,
} from "../types";

export const fetchEmployees = async (params: EmployeeListParams = {}): Promise<PaginatedResponse<Employee>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Employee>>>("/employees", { params });
  return data.data;
};

export const fetchEmployee = async (id: string): Promise<Employee> => {
  const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
  return data.data;
};

function buildEmployeeFormData(input: CreateEmployeeInput | UpdateEmployeeInput): FormData {
  const fd = new FormData();
  const { ktpFile, contractFile, ...fields } = input as CreateEmployeeInput & { ktpFile?: File; contractFile?: File };
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
    else fd.append(k, String(v));
  });
  if (ktpFile)      fd.append("ktpFile",      ktpFile);
  if (contractFile) fd.append("contractFile", contractFile);
  return fd;
}

export const createEmployee = async (input: CreateEmployeeInput): Promise<Employee> => {
  if (input.ktpFile || input.contractFile) {
    const { data } = await api.post<ApiResponse<Employee>>("/employees", buildEmployeeFormData(input), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  }
  const { data } = await api.post<ApiResponse<Employee>>("/employees", input);
  return data.data;
};

export const updateEmployee = async (id: string, input: UpdateEmployeeInput): Promise<Employee> => {
  if (input.ktpFile || input.contractFile) {
    const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, buildEmployeeFormData(input), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  }
  const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, input);
  return data.data;
};

export const updateEmployeeBranches = async (id: string, input: UpdateEmployeeBranchesInput): Promise<Employee> => {
  const { data } = await api.patch<ApiResponse<Employee>>(`/employees/${id}/branches`, input);
  return data.data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await api.delete(`/employees/${id}`);
};
