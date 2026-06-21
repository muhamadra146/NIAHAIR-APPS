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

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
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

export async function updateDeposit(id: string, input: import("./types").UpdateDepositInput): Promise<Deposit> {
  const { data } = await api.patch<ApiResponse<Deposit>>(`/deposits/${id}`, input);
  return data.data;
}

export async function deleteDeposit(id: string): Promise<void> {
  await api.delete(`/deposits/${id}`);
}

export async function linkDepositToAppointment(depositId: string, appointmentId: string): Promise<Deposit> {
  const { data } = await api.patch<ApiResponse<Deposit>>(`/deposits/${depositId}/link-appointment`, { appointmentId });
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
  const { data } = await api.get<ApiResponse<{ data: import("./types").DepositPayment[]; meta: unknown }>>(
    `/deposits/${depositId}/payments`,
    { params: { limit: 50 } },
  );
  return data.data?.data ?? [];
}

export interface DepositPaymentListParams {
  page?:            number;
  limit?:           number;
  depositId?:       string;
  paymentMethodId?: string;
  branchId?:        string;
  startDate?:       string;
  endDate?:         string;
}

export interface DepositPaymentListData {
  data: import("./types").DepositPayment[];
  meta: PaginatedResponse<import("./types").DepositPayment>["meta"];
}

export async function deleteDepositPayment(id: string): Promise<void> {
  await api.delete(`/deposit-payments/${id}`);
}

export async function fetchAllDepositPayments(
  params: DepositPaymentListParams = {},
): Promise<DepositPaymentListData> {
  const { data } = await api.get<ApiResponse<DepositPaymentListData>>("/deposit-payments", { params });
  return data.data;
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

export async function deletePayment(id: string): Promise<void> {
  await api.delete(`/payments/${id}`);
}

// ── All invoice payments (global list + summary) ─────────────────────────────

export interface InvoicePaymentListParams {
  page?:            number;
  limit?:           number;
  invoiceId?:       string;
  paymentMethodId?: string;
  branchId?:        string;
  startDate?:       string;
  endDate?:         string;
}

export interface InvoicePaymentListData {
  data: InvoicePayment[];
  meta: PaginatedResponse<InvoicePayment>["meta"];
}

export interface InvoicePaymentSummary {
  today:  { count: number; total: string };
  period: { count: number; total: string };
}

export async function fetchAllInvoicePayments(
  params: InvoicePaymentListParams = {},
): Promise<InvoicePaymentListData> {
  const { data } = await api.get<ApiResponse<InvoicePaymentListData>>("/payments", { params });
  return data.data;
}

export async function fetchInvoicePaymentSummary(
  params: { startDate?: string; endDate?: string; paymentMethodId?: string; branchId?: string } = {},
): Promise<InvoicePaymentSummary> {
  const { data } = await api.get<ApiResponse<InvoicePaymentSummary>>("/payments/summary", { params });
  return data.data;
}

// ── Deposit / payment summary & resync ───────────────────────────────────────

export interface DepositSummary {
  UNPAID:       { count: number; total: string };
  PAID:         { count: number; total: string };
  PARTIAL_USED: { count: number; total: string };
  USED:         { count: number; total: string };
}

export interface DepositPaymentSummary {
  today:  { count: number; total: string };
  period: { count: number; total: string };
}

export async function fetchDepositSummary(params: { branchId?: string } = {}): Promise<DepositSummary> {
  const { data } = await api.get<ApiResponse<DepositSummary>>("/deposits/summary", { params });
  return data.data;
}

export async function fetchDepositPaymentSummary(
  params: { startDate?: string; endDate?: string; paymentMethodId?: string; branchId?: string } = {},
): Promise<DepositPaymentSummary> {
  const { data } = await api.get<ApiResponse<DepositPaymentSummary>>("/deposit-payments/summary", { params });
  return data.data;
}

export async function resyncDeposit(id: string): Promise<{ updated?: boolean; queued?: boolean; skipped?: boolean }> {
  const { data } = await api.post<ApiResponse<{ updated?: boolean; queued?: boolean; skipped?: boolean }>>(
    `/deposits/${id}/resync`,
  );
  return data.data;
}

export async function resyncDepositPayment(id: string): Promise<{ queued?: boolean; skipped?: boolean }> {
  const { data } = await api.post<ApiResponse<{ queued?: boolean; skipped?: boolean }>>(
    `/deposit-payments/${id}/resync`,
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
  const { data } = await api.get<{ data: { data: ItemSearchResult[] } }>("/items", {
    params: { search: search || undefined, limit: 20, page: 1, isActive: true },
  });
  return data.data.data ?? [];
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
