import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { EmployeeRole, EmployeeRoleListParams, CreateEmployeeRoleInput, UpdateEmployeeRoleInput } from "../types";

export const fetchEmployeeRoles = async (params: EmployeeRoleListParams = {}): Promise<PaginatedResponse<EmployeeRole>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<EmployeeRole>>>("/employee-roles", { params });
  return data.data;
};

export const createEmployeeRole = async (input: CreateEmployeeRoleInput): Promise<EmployeeRole> => {
  const { data } = await api.post<ApiResponse<EmployeeRole>>("/employee-roles", input);
  return data.data;
};

export const updateEmployeeRole = async (id: string, input: UpdateEmployeeRoleInput): Promise<EmployeeRole> => {
  const { data } = await api.put<ApiResponse<EmployeeRole>>(`/employee-roles/${id}`, input);
  return data.data;
};
