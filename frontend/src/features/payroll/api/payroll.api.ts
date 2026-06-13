import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Payroll, GeneratePayrollInput, PayrollListParams } from "../types";

export const fetchPayrolls = async (params: PayrollListParams = {}): Promise<PaginatedResponse<Payroll>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Payroll>>>("/payroll", { params });
  return data.data;
};

export const fetchPayroll = async (id: string): Promise<Payroll> => {
  const { data } = await api.get<ApiResponse<Payroll>>(`/payroll/${id}`);
  return data.data;
};

export const generatePayroll = async (input: GeneratePayrollInput): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>("/payroll/generate", input);
  return data.data;
};

export const recalculatePayroll = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/recalculate`);
  return data.data;
};

export const submitPayroll = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/submit`);
  return data.data;
};

export const approvePayroll = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/approve`);
  return data.data;
};

export const markPayrollAsPaid = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/mark-paid`);
  return data.data;
};
