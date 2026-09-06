import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  PurchaseReturn,
  PurchaseReturnListData,
  PurchaseReturnListParams,
  CreatePurchaseReturnInput,
} from "./types";

export async function fetchPurchaseReturns(
  params: PurchaseReturnListParams = {},
): Promise<PurchaseReturnListData> {
  const { data } = await api.get<ApiResponse<PurchaseReturnListData>>(
    "/purchase-returns",
    { params },
  );
  return data.data;
}

export async function fetchPurchaseReturn(id: string): Promise<PurchaseReturn> {
  const { data } = await api.get<ApiResponse<PurchaseReturn>>(
    `/purchase-returns/${id}`,
  );
  return data.data;
}

export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput,
): Promise<PurchaseReturn> {
  const { data } = await api.post<ApiResponse<PurchaseReturn>>(
    "/purchase-returns",
    input,
  );
  return data.data;
}

export async function postPurchaseReturn(id: string): Promise<PurchaseReturn> {
  const { data } = await api.patch<ApiResponse<PurchaseReturn>>(
    `/purchase-returns/${id}/post`,
  );
  return data.data;
}

export async function cancelPurchaseReturn(id: string): Promise<PurchaseReturn> {
  const { data } = await api.patch<ApiResponse<PurchaseReturn>>(
    `/purchase-returns/${id}/cancel`,
  );
  return data.data;
}

export async function deletePurchaseReturn(
  id: string,
): Promise<{ returnId?: string; deleted?: boolean }> {
  const { data } = await api.delete<ApiResponse<{ returnId?: string; deleted?: boolean }>>(
    `/purchase-returns/${id}`,
  );
  return data.data;
}

export async function syncPurchaseReturnToAccurate(
  id: string,
): Promise<{ synced?: boolean; skipped?: boolean; accuratePurchaseReturnId?: number }> {
  const { data } = await api.post<ApiResponse<{ synced?: boolean; skipped?: boolean; accuratePurchaseReturnId?: number }>>(
    `/purchase-returns/${id}/sync/accurate`,
  );
  return data.data;
}
