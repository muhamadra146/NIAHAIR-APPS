import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Supplier, PurchaseInvoice, PurchaseListParams,
  CreatePurchaseInvoiceInput, PostPurchaseResult,
} from "./types";

interface PurchaseListData {
  data: PurchaseInvoice[];
  meta: PaginatedResponse<PurchaseInvoice>["meta"];
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<ApiResponse<{ data: Supplier[]; meta: unknown }>>("/suppliers", {
    params: { limit: 100 },
  });
  return data.data.data;
}

export async function fetchPurchaseInvoices(params: PurchaseListParams = {}): Promise<PurchaseListData> {
  const { data } = await api.get<ApiResponse<PurchaseListData>>("/purchase-invoices", { params });
  return data.data;
}

export async function fetchPurchaseInvoice(id: string): Promise<PurchaseInvoice> {
  const { data } = await api.get<ApiResponse<PurchaseInvoice>>(`/purchase-invoices/${id}`);
  return data.data;
}

export async function createPurchaseInvoice(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoice> {
  const { data } = await api.post<ApiResponse<PurchaseInvoice>>("/purchase-invoices", input);
  return data.data;
}

export async function updatePurchaseInvoice(id: string, input: Partial<CreatePurchaseInvoiceInput>): Promise<PurchaseInvoice> {
  const { data } = await api.patch<ApiResponse<PurchaseInvoice>>(`/purchase-invoices/${id}`, input);
  return data.data;
}

export async function postPurchaseInvoice(id: string): Promise<PostPurchaseResult> {
  const { data } = await api.post<ApiResponse<PostPurchaseResult>>(`/purchase-invoices/${id}/post`);
  return data.data;
}

export async function cancelPurchaseInvoice(id: string): Promise<{ invoiceId: string; cancelled: boolean }> {
  const { data } = await api.post<ApiResponse<{ invoiceId: string; cancelled: boolean }>>(`/purchase-invoices/${id}/cancel`);
  return data.data;
}

export async function deletePurchaseInvoice(id: string): Promise<{ invoiceId: string; deleted: boolean }> {
  const { data } = await api.delete<ApiResponse<{ invoiceId: string; deleted: boolean }>>(`/purchase-invoices/${id}`);
  return data.data;
}

export async function syncSuppliers(): Promise<{ created: number; updated: number; failed: number }> {
  const { data } = await api.post<ApiResponse<{ created: number; updated: number; failed: number }>>("/suppliers/sync/accurate");
  return data.data;
}

export async function fetchLastPurchasePrice(itemId: string, unitId: string): Promise<number | null> {
  const { data } = await api.get<ApiResponse<{ price: string | null }>>(
    `/purchase-invoices/items/${itemId}/last-price`,
    { params: { unitId } },
  );
  const p = data.data.price;
  return p != null ? Number(p) : null;
}
