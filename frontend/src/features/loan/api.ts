import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Loan, LoanRepayment, LoanListParams, CreateLoanInput, UpdateLoanInput, AddRepaymentInput } from "./types";

interface LoanListData {
  data: Loan[];
  meta: PaginatedResponse<Loan>["meta"];
}

export async function fetchLoans(params: LoanListParams = {}): Promise<LoanListData> {
  const { data } = await api.get<ApiResponse<LoanListData>>("/loans", { params });
  return data.data;
}

export async function fetchLoansByEmployee(employeeId: string): Promise<Loan[]> {
  const { data } = await api.get<ApiResponse<Loan[]>>(`/loans/employee/${employeeId}`);
  return data.data;
}

export async function fetchLoan(id: string): Promise<Loan> {
  const { data } = await api.get<ApiResponse<Loan>>(`/loans/${id}`);
  return data.data;
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const { data } = await api.post<ApiResponse<Loan>>("/loans", input);
  return data.data;
}

export async function updateLoan(id: string, input: UpdateLoanInput): Promise<Loan> {
  const { data } = await api.put<ApiResponse<Loan>>(`/loans/${id}`, input);
  return data.data;
}

export async function cancelLoan(id: string): Promise<Loan> {
  const { data } = await api.post<ApiResponse<Loan>>(`/loans/${id}/cancel`);
  return data.data;
}

export async function addRepayment(id: string, input: AddRepaymentInput): Promise<LoanRepayment> {
  const { data } = await api.post<ApiResponse<LoanRepayment>>(`/loans/${id}/repayments`, input);
  return data.data;
}

export async function fetchRepayments(id: string): Promise<LoanRepayment[]> {
  const { data } = await api.get<ApiResponse<LoanRepayment[]>>(`/loans/${id}/repayments`);
  return data.data;
}

// ── Self-service ──────────────────────────────────────────────────────────────

export async function fetchMyLoans(): Promise<Loan[]> {
  const { data } = await api.get<ApiResponse<Loan[]>>("/loans/my");
  return data.data;
}

export async function fetchMyLoan(id: string): Promise<Loan> {
  const { data } = await api.get<ApiResponse<Loan>>(`/loans/my/${id}`);
  return data.data;
}

export async function deleteLoan(id: string): Promise<void> {
  await api.delete(`/loans/${id}`);
}
