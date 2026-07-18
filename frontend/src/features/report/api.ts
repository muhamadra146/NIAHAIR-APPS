import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { SummaryReport, DailyRevenue, CommissionByEmployee, SalesByItem, ReportParams } from "./types";

export async function fetchSummaryReport(params: ReportParams = {}): Promise<SummaryReport> {
  const { data } = await api.get<ApiResponse<SummaryReport>>("/reports/summary", { params });
  return data.data;
}

export async function fetchRevenueReport(params: ReportParams = {}): Promise<DailyRevenue[]> {
  const { data } = await api.get<ApiResponse<DailyRevenue[]>>("/reports/revenue", { params });
  return data.data;
}

export async function fetchCommissionReport(
  params: Pick<ReportParams, "startDate" | "endDate"> = {},
): Promise<CommissionByEmployee[]> {
  const { data } = await api.get<ApiResponse<CommissionByEmployee[]>>("/reports/commissions", { params });
  return data.data;
}

export async function fetchSalesByItem(params: ReportParams = {}): Promise<SalesByItem[]> {
  const { data } = await api.get<ApiResponse<SalesByItem[]>>("/reports/sales-by-item", { params });
  return data.data;
}
