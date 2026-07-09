import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Employee,
  EmployeeRole,
  SalarySetting,
  EmployeeListParams,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UploadEmployeeFilesInput,
  UpdateEmployeeBranchesInput,
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

export async function uploadEmployeeFiles(
  id: string,
  input: UploadEmployeeFilesInput,
): Promise<Employee> {
  const fd = new FormData();
  if (input.ktpFile)      fd.append("ktpFile",      input.ktpFile);
  if (input.contractFile) fd.append("contractFile", input.contractFile);
  const { data } = await api.patch<ApiResponse<Employee>>(`/employees/${id}/files`, fd, {
    // Remove default Content-Type so browser sets multipart/form-data + boundary automatically
    transformRequest: [(reqData, headers) => {
      if (headers) {
        delete (headers as Record<string, unknown>)["Content-Type"];
        delete (headers as Record<string, unknown>)["content-type"];
      }
      return reqData;
    }],
  });
  return data.data;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.patch(`/employees/${id}/deactivate`);
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function updateEmployeeBranches(
  id: string,
  input: UpdateEmployeeBranchesInput,
): Promise<Employee> {
  const { data } = await api.patch<ApiResponse<Employee>>(`/employees/${id}/branches`, input);
  return data.data;
}

// ── Employee Roles ────────────────────────────────────────────────────────────

export async function fetchEmployeeRoles(): Promise<EmployeeRole[]> {
  const { data } = await api.get<ApiResponse<{ data: EmployeeRole[] }>>("/employee-roles");
  return data.data.data;
}

export async function fetchNextEmployeeCode(): Promise<string> {
  const { data } = await api.get<ApiResponse<{ code: string }>>("/employees/next-code");
  return data.data.code;
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
