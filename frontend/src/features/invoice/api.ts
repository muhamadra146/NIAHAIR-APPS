import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Invoice,
  Deposit,
  InvoicePayment,
  InvoiceListParams,
  DepositListParams,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  AddPaymentInput,
  ApplyDepositInput,
  CreateDepositInput,
} from "./types";

interface InvoiceListData {
  data: Invoice[];
  meta: PaginatedResponse<Invoice>["meta"];
}

interface DepositListData {
  data: Deposit[];
  meta: PaginatedResponse<Deposit>["meta"];
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function fetchInvoices(params: InvoiceListParams = {}): Promise<InvoiceListData> {
  const { data } = await api.get<ApiResponse<InvoiceListData>>("/invoices", { params });
  return data.data;
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
  return data.data;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const { data } = await api.post<ApiResponse<Invoice>>("/invoices", input);
  return data.data;
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
  const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}`, input);
  return data.data;
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/cancel`);
  return data.data;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function fetchPayments(invoiceId: string): Promise<InvoicePayment[]> {
  const { data } = await api.get<ApiResponse<{ payments: InvoicePayment[] }>>(
    `/invoices/${invoiceId}/payments`,
  );
  return data.data.payments ?? [];
}

export async function addPayment(invoiceId: string, input: AddPaymentInput): Promise<InvoicePayment> {
  const { data } = await api.post<ApiResponse<InvoicePayment>>(
    `/invoices/${invoiceId}/payments`,
    input,
  );
  return data.data;
}

// ── Deposit on invoice ────────────────────────────────────────────────────────

export async function applyDeposit(invoiceId: string, input: ApplyDepositInput): Promise<Invoice> {
  const { data } = await api.post<ApiResponse<Invoice>>(
    `/invoices/${invoiceId}/deposits`,
    input,
  );
  return data.data;
}

// ── Deposits ──────────────────────────────────────────────────────────────────

export async function fetchDeposits(params: DepositListParams = {}): Promise<DepositListData> {
  const { data } = await api.get<ApiResponse<DepositListData>>("/deposits", { params });
  return data.data;
}

export async function fetchDeposit(id: string): Promise<Deposit> {
  const { data } = await api.get<ApiResponse<Deposit>>(`/deposits/${id}`);
  return data.data;
}

export async function createDeposit(input: CreateDepositInput): Promise<Deposit> {
  const { data } = await api.post<ApiResponse<Deposit>>("/deposits", input);
  return data.data;
}

export async function refundDeposit(id: string): Promise<Deposit> {
  const { data } = await api.patch<ApiResponse<Deposit>>(`/deposits/${id}/refund`);
  return data.data;
}

export async function cancelDeposit(id: string): Promise<Deposit> {
  const { data } = await api.patch<ApiResponse<Deposit>>(`/deposits/${id}/cancel`);
  return data.data;
}

// ── Deposit Payments ──────────────────────────────────────────────────────────

export async function fetchDepositPayments(depositId: string): Promise<import("./types").DepositPayment[]> {
  const { data } = await api.get<ApiResponse<import("./types").DepositPayment[]>>(
    `/deposits/${depositId}/payments`,
  );
  return data.data ?? [];
}

export async function createDepositPayment(
  depositId: string,
  input: import("./types").CreateDepositPaymentInput,
): Promise<import("./types").DepositPayment> {
  if (input.transferProof) {
    const fd = new FormData();
    fd.append("paymentMethodId", input.paymentMethodId);
    if (input.paidAt)      fd.append("paidAt",      input.paidAt);
    if (input.referenceNo) fd.append("referenceNo", input.referenceNo);
    if (input.notes)       fd.append("notes",       input.notes);
    fd.append("transferProof", input.transferProof);
    const { data } = await api.post<ApiResponse<import("./types").DepositPayment>>(
      `/deposits/${depositId}/payments`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data;
  }
  const { data } = await api.post<ApiResponse<import("./types").DepositPayment>>(
    `/deposits/${depositId}/payments`,
    input,
  );
  return data.data;
}

// ── Items search (SERVICE + INVENTORY) ───────────────────────────────────────

export interface ItemPriceOption {
  unitId:       string;
  branchId:     string | null;
  sellingPrice: string;
}

export interface ItemUnitOption {
  id:              string;
  isDefault:       boolean;
  conversionFactor: string;
  unit:            { id: string; name: string };
}

export interface ItemSearchResult {
  id:         string;
  name:       string;
  itemCode:   string;
  itemType:   string;
  itemPrices: ItemPriceOption[];
  itemUnits:  ItemUnitOption[];
}

export async function fetchInvoiceItems(search: string): Promise<ItemSearchResult[]> {
  const { data } = await api.get<{ data: { items: ItemSearchResult[] } }>("/items", {
    params: { search: search || undefined, limit: 20, page: 1 },
  });
  return data.data.items ?? [];
}

export async function fetchFullItem(itemId: string): Promise<ItemSearchResult> {
  const { data } = await api.get<{ data: ItemSearchResult }>(`/items/${itemId}`);
  return data.data;
}

// ── Customer deposits (available to apply) ────────────────────────────────────

export async function fetchCustomerAvailableDeposits(customerId: string): Promise<Deposit[]> {
  const res = await fetchDeposits({ customerId, limit: 50 });
  return (res.data ?? []).filter(
    (d) => (d.status === "PAID" || d.status === "PARTIAL_USED") && Number(d.remainingAmount) > 0,
  );
}
