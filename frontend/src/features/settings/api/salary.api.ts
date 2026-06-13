import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { SalarySetting, CreateSalaryInput, UpdateSalaryInput } from "../types";

export const fetchSalarySettings = async (employeeId: string): Promise<SalarySetting[]> => {
  const { data } = await api.get<ApiResponse<SalarySetting[]>>(`/salary-settings/employee/${employeeId}`);
  return data.data;
};

export const fetchActiveSalarySetting = async (employeeId: string): Promise<SalarySetting> => {
  const { data } = await api.get<ApiResponse<SalarySetting>>(`/salary-settings/employee/${employeeId}/active`);
  return data.data;
};

export const createSalarySetting = async (body: CreateSalaryInput): Promise<SalarySetting> => {
  const { data } = await api.post<ApiResponse<SalarySetting>>("/salary-settings", body);
  return data.data;
};

export const updateSalarySetting = async (id: string, body: UpdateSalaryInput): Promise<SalarySetting> => {
  const { data } = await api.put<ApiResponse<SalarySetting>>(`/salary-settings/${id}`, body);
  return data.data;
};
