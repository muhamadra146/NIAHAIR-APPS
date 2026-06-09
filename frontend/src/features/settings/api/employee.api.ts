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

export const createEmployee = async (input: CreateEmployeeInput): Promise<Employee> => {
  const { data } = await api.post<ApiResponse<Employee>>("/employees", input);
  return data.data;
};

export const updateEmployee = async (id: string, input: UpdateEmployeeInput): Promise<Employee> => {
  const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, input);
  return data.data;
};

export const updateEmployeeBranches = async (id: string, input: UpdateEmployeeBranchesInput): Promise<Employee> => {
  const { data } = await api.patch<ApiResponse<Employee>>(`/employees/${id}/branches`, input);
  return data.data;
};
