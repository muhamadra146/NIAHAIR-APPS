import { api }  from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { FinanceDashboardData } from "./types";

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
