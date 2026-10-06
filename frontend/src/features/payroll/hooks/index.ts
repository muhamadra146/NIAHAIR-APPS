import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPayrolls, fetchPayroll,
  generatePayroll, recalculatePayroll,
  submitPayroll, approvePayroll, markPayrollAsPaid,
  fetchMyPayrolls, fetchBpjsReport, deletePayroll, bulkGeneratePayroll, previewPayrollPeriod,
} from "../api/payroll.api";
import type { PayrollListParams, GeneratePayrollInput, BpjsReportParams, BulkGenerateInput, PayrollPeriodPreviewParams } from "../types";

const QK = "payrolls";

export const usePayrolls = (params: PayrollListParams = {}) =>
  useQuery({ queryKey: [QK, params], queryFn: () => fetchPayrolls(params) });

export const usePayroll = (id: string) =>
  useQuery({ queryKey: [QK, id], queryFn: () => fetchPayroll(id), enabled: Boolean(id) });

const invalidate = (qc: ReturnType<typeof useQueryClient>, id?: string) => {
  qc.invalidateQueries({ queryKey: [QK] });
  if (id) qc.invalidateQueries({ queryKey: [QK, id] });
};

// Pratinjau periode + peringatan; aktif bila parameter lengkap
export const usePayrollPeriodPreview = (params: PayrollPeriodPreviewParams, enabled: boolean) =>
  useQuery({
    queryKey: [QK, "period-preview", params],
    queryFn:  () => previewPayrollPeriod(params),
    enabled,
    retry:    false,
  });

export const useGeneratePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GeneratePayrollInput) => generatePayroll(input),
    onSuccess:  () => invalidate(qc),
  });
};

export const useRecalculatePayroll = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recalculatePayroll(id),
    onSuccess:  () => invalidate(qc, id),
  });
};

export const useSubmitPayroll = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => submitPayroll(id),
    onSuccess:  () => invalidate(qc, id),
  });
};

export const useApprovePayroll = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => approvePayroll(id),
    onSuccess:  () => invalidate(qc, id),
  });
};

export const useMarkPayrollAsPaid = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markPayrollAsPaid(id),
    onSuccess:  () => invalidate(qc, id),
  });
};

export const useDeletePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayroll(id),
    onSuccess:  () => invalidate(qc),
  });
};

export const useMyPayrolls = (params: { page?: number; limit?: number; year?: number } = {}) =>
  useQuery({ queryKey: ["myPayrolls", params], queryFn: () => fetchMyPayrolls(params) });

export const useBpjsReport = (params: BpjsReportParams) =>
  useQuery({
    queryKey: ["bpjsReport", params],
    queryFn:  () => fetchBpjsReport(params),
    enabled:  !!params.yearMonth,
  });

export const useBulkGeneratePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkGenerateInput) => bulkGeneratePayroll(input),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: [QK] }); },
  });
};
