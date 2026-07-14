import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchLoans,
  fetchLoan,
  fetchLoansByEmployee,
  createLoan,
  updateLoan,
  cancelLoan,
  addRepayment,
  fetchRepayments,
} from "./api";
import type { LoanListParams, CreateLoanInput, UpdateLoanInput, AddRepaymentInput } from "./types";

export function useLoans(params: LoanListParams = {}) {
  return useQuery({
    queryKey:       ["loans", params],
    queryFn:        () => fetchLoans(params),
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey:       ["loans", id],
    queryFn:        () => fetchLoan(id),
    enabled:        !!id,
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useLoansByEmployee(employeeId: string) {
  return useQuery({
    queryKey:       ["loans", "employee", employeeId],
    queryFn:        () => fetchLoansByEmployee(employeeId),
    enabled:        !!employeeId,
    staleTime:      0,
    refetchOnMount: true,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoanInput) => createLoan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Kasbon berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLoan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLoanInput) => updateLoan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Kasbon diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelLoan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelLoan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Kasbon dibatalkan");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddRepayment(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRepaymentInput) => addRepayment(loanId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Angsuran dicatat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRepayments(loanId: string) {
  return useQuery({
    queryKey:       ["loan-repayments", loanId],
    queryFn:        () => fetchRepayments(loanId),
    enabled:        !!loanId,
    staleTime:      0,
    refetchOnMount: true,
  });
}
