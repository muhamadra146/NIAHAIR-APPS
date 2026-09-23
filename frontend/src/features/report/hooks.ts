import { useQuery } from "@tanstack/react-query";
import {
  fetchSummaryReport, fetchRevenueReport, fetchCommissionReport, fetchSalesByItem,
  fetchInventoryReport, fetchProductionReport, fetchCustomerAnalytics,
} from "./api";
import type { ReportParams } from "./types";

export function useSummaryReport(params: ReportParams = {}) {
  return useQuery({
    queryKey: ["reports", "summary", params],
    queryFn:  () => fetchSummaryReport(params),
    staleTime: 60_000,
  });
}

export function useRevenueReport(params: ReportParams = {}) {
  return useQuery({
    queryKey: ["reports", "revenue", params],
    queryFn:  () => fetchRevenueReport(params),
    staleTime: 60_000,
  });
}

export function useCommissionReport(params: ReportParams = {}) {
  return useQuery({
    queryKey: ["reports", "commissions", params],
    queryFn:  () => fetchCommissionReport(params),
    staleTime: 60_000,
  });
}

export function useSalesByItem(params: ReportParams = {}) {
  return useQuery({
    queryKey: ["reports", "sales-by-item", params],
    queryFn:  () => fetchSalesByItem(params),
    staleTime: 60_000,
  });
}

export function useInventoryReport(params: Pick<ReportParams, "branchId"> = {}) {
  return useQuery({
    queryKey: ["reports", "inventory", params],
    queryFn:  () => fetchInventoryReport(params),
    staleTime: 60_000,
  });
}

export function useProductionReport(params: Pick<ReportParams, "startDate" | "endDate"> = {}) {
  return useQuery({
    queryKey: ["reports", "production", params],
    queryFn:  () => fetchProductionReport(params),
    staleTime: 60_000,
  });
}

export function useCustomerAnalytics(params: ReportParams = {}) {
  return useQuery({
    queryKey: ["reports", "customer-analytics", params],
    queryFn:  () => fetchCustomerAnalytics(params),
    staleTime: 60_000,
  });
}
