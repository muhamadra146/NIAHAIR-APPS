import { useQuery } from "@tanstack/react-query";
import { fetchFinanceDashboard, fetchFinanceDetails } from "./api";
import type { FinanceDashboardParams } from "./api";
import type { FinanceDetails } from "./types";

export function useFinanceDashboard(params: FinanceDashboardParams = {}) {
  return useQuery({
    queryKey: ["finance-dashboard", params],
    queryFn:  () => fetchFinanceDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 menit
  });
}

export function useFinanceDetails(type: FinanceDetails["type"], params: FinanceDashboardParams = {}) {
  return useQuery({
    queryKey: ["finance-dashboard", "details", type, params],
    queryFn:  () => fetchFinanceDetails(type, params),
    staleTime: 60 * 1000,
  });
}
