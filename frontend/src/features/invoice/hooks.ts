import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  cancelInvoice,
  fetchPayments,
  addPayment,
  applyDeposit,
  fetchDeposits,
  fetchDeposit,
  createDeposit,
  refundDeposit,
  cancelDeposit,
  fetchCustomerAvailableDeposits,
  fetchDepositPayments,
  createDepositPayment,
} from "./api";
import type {
  InvoiceListParams,
  DepositListParams,
  CreateInvoiceInput,
  AddPaymentInput,
  ApplyDepositInput,
  CreateDepositInput,
  CreateDepositPaymentInput,
} from "./types";

// ── Invoices ──────────────────────────────────────────────────────────────────

export function useInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn:  () => fetchInvoices(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn:  () => fetchInvoice(id),
    enabled:  !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn:  () => fetchPayments(invoiceId),
    enabled:  !!invoiceId,
  });
}

export function useAddPayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPaymentInput) => addPayment(invoiceId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      qc.invalidateQueries({ queryKey: ["payments", invoiceId] });
      toast.success("Pembayaran dicatat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApplyDeposit(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyDepositInput) => applyDeposit(invoiceId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit diterapkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Deposits ──────────────────────────────────────────────────────────────────

export function useDeposits(params: DepositListParams = {}) {
  return useQuery({
    queryKey: ["deposits", params],
    queryFn:  () => fetchDeposits(params),
  });
}

export function useDeposit(id: string) {
  return useQuery({
    queryKey: ["deposits", id],
    queryFn:  () => fetchDeposit(id),
    enabled:  !!id,
  });
}

export function useCustomerAvailableDeposits(customerId: string) {
  return useQuery({
    queryKey: ["deposits", "available", customerId],
    queryFn:  () => fetchCustomerAvailableDeposits(customerId),
    enabled:  !!customerId,
  });
}

export function useAppointmentDeposits(appointmentId: string) {
  return useQuery({
    queryKey: ["deposits", "appointment", appointmentId],
    queryFn:  async () => {
      const res = await fetchDeposits({ appointmentId, limit: 10 });
      return (res.data ?? []).filter(
        (d) => (d.status === "PAID" || d.status === "PARTIAL_USED") && Number(d.remainingAmount) > 0,
      );
    },
    enabled:   !!appointmentId,
    staleTime: 0,
  });
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepositInput) => createDeposit(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRefundDeposit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refundDeposit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit di-refund");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelDeposit(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelDeposit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Deposit Payments ──────────────────────────────────────────────────────────

export function useDepositPayments(depositId: string) {
  return useQuery({
    queryKey: ["deposit-payments", depositId],
    queryFn:  () => fetchDepositPayments(depositId),
    enabled:  !!depositId,
  });
}

export function useCreateDepositPayment(depositId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepositPaymentInput) => createDepositPayment(depositId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["deposit-payments", depositId] });
      toast.success("Pembayaran deposit dicatat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
