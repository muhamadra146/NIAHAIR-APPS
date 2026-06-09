import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { CashAccount, CashAccountListParams, CreateCashAccountInput, UpdateCashAccountInput } from "../types";

export const fetchCashAccounts = async (params: CashAccountListParams = {}): Promise<PaginatedResponse<CashAccount>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<CashAccount>>>("/cash-accounts", { params });
  return data.data;
};

export const syncCashAccounts = async (): Promise<{ synced: number; skipped: number }> => {
  const { data } = await api.post<ApiResponse<{ synced: number; skipped: number }>>("/cash-accounts/sync/accurate");
  return data.data;
};

export const fetchAllCashAccounts = async (): Promise<CashAccount[]> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<CashAccount>>>("/cash-accounts", {
    params: { limit: 100 },
  });
  return data.data.data ?? [];
};

export const createCashAccount = async (input: CreateCashAccountInput): Promise<CashAccount> => {
  const { data } = await api.post<ApiResponse<CashAccount>>("/cash-accounts", input);
  return data.data;
};

export const updateCashAccount = async (id: string, input: UpdateCashAccountInput): Promise<CashAccount> => {
  const { data } = await api.put<ApiResponse<CashAccount>>(`/cash-accounts/${id}`, input);
  return data.data;
};

export const deleteCashAccount = async (id: string): Promise<void> => {
  await api.delete(`/cash-accounts/${id}`);
};
