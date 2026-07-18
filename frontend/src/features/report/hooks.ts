import { useQuery } from "@tanstack/react-query";
import { fetchSummaryReport, fetchRevenueReport, fetchCommissionReport, fetchSalesByItem } from "./api";
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

export function useCommissionReport(params: Pick<ReportParams, "startDate" | "endDate"> = {}) {
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
