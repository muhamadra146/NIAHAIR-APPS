import { api }  from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { FinanceDashboardData, FinanceDetails } from "./types";

export interface FinanceDashboardParams {
  startDate?: string;
  endDate?:   string;
  branchId?:  string;
}

export async function fetchFinanceDashboard(
  params: FinanceDashboardParams = {},
): Promise<FinanceDashboardData> {
  const { data } = await api.get<ApiResponse<FinanceDashboardData>>(
    "/dashboard/finance",
    { params },
  );
  return data.data;
}

/** Data di balik kartu dashboard: baris pendapatan atau daftar pembelian */
export async function fetchFinanceDetails(
  type: FinanceDetails["type"],
  params: FinanceDashboardParams = {},
): Promise<FinanceDetails> {
  const { data } = await api.get<ApiResponse<FinanceDetails>>(
    "/dashboard/finance/details",
    { params: { type, ...params } },
  );
  return data.data;
}
