import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Payroll, GeneratePayrollInput, PayrollListParams, BpjsReportResult, BpjsReportParams, IncomeRecapResult, IncomeRecapParams, Pph21MonthlyResult, Pph21AnnualResult, ManualItemInput, BulkGenerateInput, BulkGenerateResult, PayrollPeriodPreview, PayrollPeriodPreviewParams } from "../types";

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

export const previewPayrollPeriod = async (params: PayrollPeriodPreviewParams): Promise<PayrollPeriodPreview> => {
  const { data } = await api.get<ApiResponse<PayrollPeriodPreview>>("/payroll/period-preview", { params });
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

export const revertPayrollToDraft = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/revert-draft`);
  return data.data;
};

export const retryPayrollSync = async (id: string): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/sync-retry`);
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

export const fetchMyPayrolls = async (params: { page?: number; limit?: number; year?: number } = {}): Promise<PaginatedResponse<Payroll>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Payroll>>>("/payroll/my", { params });
  return data.data;
};

export const fetchBpjsReport = async (params: BpjsReportParams): Promise<BpjsReportResult> => {
  const { data } = await api.get<ApiResponse<BpjsReportResult>>("/payroll/bpjs-report", { params });
  return data.data;
};

export const fetchIncomeRecap = async (params: IncomeRecapParams): Promise<IncomeRecapResult> => {
  const { data } = await api.get<ApiResponse<IncomeRecapResult>>("/payroll/income-recap", { params });
  return data.data;
};

// Item gaji manual (PAY-038) — respons = payroll setelah dihitung ulang
export const addPayrollItem = async (id: string, input: ManualItemInput): Promise<Payroll> => {
  const { data } = await api.post<ApiResponse<Payroll>>(`/payroll/${id}/items`, input);
  return data.data;
};

export const updatePayrollItem = async (id: string, itemId: string, input: ManualItemInput): Promise<Payroll> => {
  const { data } = await api.put<ApiResponse<Payroll>>(`/payroll/${id}/items/${itemId}`, { amount: input.amount, notes: input.notes });
  return data.data;
};

export const deletePayrollItem = async (id: string, itemId: string): Promise<Payroll> => {
  const { data } = await api.delete<ApiResponse<Payroll>>(`/payroll/${id}/items/${itemId}`);
  return data.data;
};

export const fetchPph21Monthly = async (params: { taxPeriod: string; branchId?: string }): Promise<Pph21MonthlyResult> => {
  const { data } = await api.get<ApiResponse<Pph21MonthlyResult>>("/payroll/pph21-report/monthly", { params });
  return data.data;
};

export const fetchPph21Annual = async (params: { year: string; branchId?: string }): Promise<Pph21AnnualResult> => {
  const { data } = await api.get<ApiResponse<Pph21AnnualResult>>("/payroll/pph21-report/annual", { params });
  return data.data;
};

export const bulkGeneratePayroll = async (input: BulkGenerateInput): Promise<BulkGenerateResult> => {
  const { data } = await api.post<ApiResponse<BulkGenerateResult>>("/payroll/bulk-generate", input);
  return data.data;
};
