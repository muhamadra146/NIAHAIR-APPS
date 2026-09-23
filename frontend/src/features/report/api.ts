import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  SummaryReport, DailyRevenue, CommissionByEmployee, SalesByItem, ReportParams,
  InventoryReport, ProductionReport, CustomerAnalytics,
} from "./types";

export async function fetchSummaryReport(params: ReportParams = {}): Promise<SummaryReport> {
  const { data } = await api.get<ApiResponse<SummaryReport>>("/reports/summary", { params });
  return data.data;
}

export async function fetchRevenueReport(params: ReportParams = {}): Promise<DailyRevenue[]> {
  const { data } = await api.get<ApiResponse<DailyRevenue[]>>("/reports/revenue", { params });
  return data.data;
}

export async function fetchCommissionReport(
  params: ReportParams = {},
): Promise<CommissionByEmployee[]> {
  const { data } = await api.get<ApiResponse<CommissionByEmployee[]>>("/reports/commissions", { params });
  return data.data;
}

export async function fetchSalesByItem(params: ReportParams = {}): Promise<SalesByItem[]> {
  const { data } = await api.get<ApiResponse<SalesByItem[]>>("/reports/sales-by-item", { params });
  return data.data;
}

export async function fetchInventoryReport(params: Pick<ReportParams, "branchId"> = {}): Promise<InventoryReport> {
  const { data } = await api.get<ApiResponse<InventoryReport>>("/reports/inventory", { params });
  return data.data;
}

export async function fetchProductionReport(params: Pick<ReportParams, "startDate" | "endDate"> = {}): Promise<ProductionReport> {
  const { data } = await api.get<ApiResponse<ProductionReport>>("/reports/production", { params });
  return data.data;
}

export async function fetchCustomerAnalytics(params: ReportParams = {}): Promise<CustomerAnalytics> {
  const { data } = await api.get<ApiResponse<CustomerAnalytics>>("/reports/customer-analytics", { params });
  return data.data;
}
