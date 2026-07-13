import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export interface CommissionGenerateInvoice {
  id:                string;
  invoiceNo:         string;
  invoiceDate:       string;
  grandTotal:        string;
  commissionSkipped: boolean;
  customer: { id: string; name: string; customerNo: string };
  branch:   { id: string; name: string };
  _count:   { commissions: number };
}

export interface CommissionGenerateListData {
  data: CommissionGenerateInvoice[];
  meta: PaginatedResponse<CommissionGenerateInvoice>["meta"];
}

export interface CommissionGenerateListParams {
  page?:      number;
  limit?:     number;
  branchId?:  string;
  startDate?: string;
  endDate?:   string;
}

export async function fetchCommissionGenerateList(
  params: CommissionGenerateListParams = {},
): Promise<CommissionGenerateListData> {
  const { data } = await api.get<ApiResponse<CommissionGenerateListData>>(
    "/invoices/commission-generate",
    { params },
  );
  return data.data;
}

export async function skipCommission(invoiceId: string): Promise<{ id: string; commissionSkipped: boolean }> {
  const { data } = await api.post<ApiResponse<{ id: string; commissionSkipped: boolean }>>(
    `/invoices/${invoiceId}/skip-commission`,
  );
  return data.data;
}

export async function resetCommissionSkip(invoiceId: string): Promise<{ id: string; commissionSkipped: boolean }> {
  const { data } = await api.post<ApiResponse<{ id: string; commissionSkipped: boolean }>>(
    `/invoices/${invoiceId}/reset-commission-skip`,
  );
  return data.data;
}
