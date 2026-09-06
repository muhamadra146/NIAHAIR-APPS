import { useQuery } from "@tanstack/react-query";
import { fetchFinanceDashboard } from "./api";
import type { FinanceDashboardParams } from "./api";

export function useFinanceDashboard(params: FinanceDashboardParams = {}) {
  return useQuery({
    queryKey: ["finance-dashboard", params],
    queryFn:  () => fetchFinanceDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 menit
  });
}
