import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Payroll, GeneratePayrollInput, PayrollListParams, BpjsReportResult, BpjsReportParams, BulkGenerateInput, BulkGenerateResult } from "../types";

export const deletePayroll = async (id: string): Promise<void> => {
  await api.delete(`/payroll/${id}`);
};

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

export const fetchMyPayrolls = async (params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Payroll>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Payroll>>>("/payroll/my", { params });
  return data.data;
};

export const fetchBpjsReport = async (params: BpjsReportParams): Promise<BpjsReportResult> => {
  const { data } = await api.get<ApiResponse<BpjsReportResult>>("/payroll/bpjs-report", { params });
  return data.data;
};

export const bulkGeneratePayroll = async (input: BulkGenerateInput): Promise<BulkGenerateResult> => {
  const { data } = await api.post<ApiResponse<BulkGenerateResult>>("/payroll/bulk-generate", input);
  return data.data;
};
