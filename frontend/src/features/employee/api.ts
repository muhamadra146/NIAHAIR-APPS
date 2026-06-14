import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Employee,
  EmployeeRole,
  SalarySetting,
  EmployeeListParams,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateSalarySettingInput,
  UpdateSalarySettingInput,
} from "./types";

// ── Employees ─────────────────────────────────────────────────────────────────

export async function fetchEmployees(
  params: EmployeeListParams = {},
): Promise<PaginatedResponse<Employee>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Employee>>>(
    "/employees",
    { params },
  );
  return data.data;
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
  return data.data;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const { data } = await api.post<ApiResponse<Employee>>("/employees", input);
  return data.data;
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, input);
  return data.data;
}

// ── Employee Roles ────────────────────────────────────────────────────────────

export async function fetchEmployeeRoles(): Promise<EmployeeRole[]> {
  const { data } = await api.get<ApiResponse<EmployeeRole[]>>("/employee-roles");
  return data.data;
}

// ── Salary Settings ───────────────────────────────────────────────────────────

export async function fetchSalarySettings(employeeId: string): Promise<SalarySetting[]> {
  const { data } = await api.get<ApiResponse<SalarySetting[]>>(
    `/salary-settings/employee/${employeeId}`,
  );
  return data.data;
}

export async function fetchActiveSalarySetting(employeeId: string): Promise<SalarySetting | null> {
  try {
    const { data } = await api.get<ApiResponse<SalarySetting>>(
      `/salary-settings/employee/${employeeId}/active`,
    );
    return data.data;
  } catch {
    return null;
  }
}

export async function createSalarySetting(
  input: CreateSalarySettingInput,
): Promise<SalarySetting> {
  const { data } = await api.post<ApiResponse<SalarySetting>>("/salary-settings", input);
  return data.data;
}

export async function updateSalarySetting(
  id: string,
  input: UpdateSalarySettingInput,
): Promise<SalarySetting> {
  const { data } = await api.put<ApiResponse<SalarySetting>>(
    `/salary-settings/${id}`,
    input,
  );
  return data.data;
}
