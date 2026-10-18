import { useQuery } from "@tanstack/react-query";
import { fetchFinanceDashboard, fetchFinanceDetails } from "./api";
import type { FinanceDashboardParams } from "./api";
import type { FinanceDetails } from "./types";

// enabled=false saat filter tanggal tidak valid ("Dari" > "Sampai") — peringatan sudah tampil di filter
export function useFinanceDashboard(params: FinanceDashboardParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["finance-dashboard", params],
    queryFn:  () => fetchFinanceDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 menit
    enabled,
  });
}

export function useFinanceDetails(type: FinanceDetails["type"], params: FinanceDashboardParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["finance-dashboard", "details", type, params],
    queryFn:  () => fetchFinanceDetails(type, params),
    staleTime: 60 * 1000,
    enabled,
  });
}
