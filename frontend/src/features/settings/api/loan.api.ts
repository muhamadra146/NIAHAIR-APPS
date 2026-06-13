import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Loan, LoanRepayment, CreateLoanInput, UpdateLoanInput, AddRepaymentInput, LoanListParams } from "../types";

export const fetchLoans = async (params: LoanListParams = {}): Promise<PaginatedResponse<Loan>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Loan>>>("/loans", { params });
  return data.data;
};

export const fetchLoansByEmployee = async (employeeId: string): Promise<Loan[]> => {
  const { data } = await api.get<ApiResponse<Loan[]>>(`/loans/employee/${employeeId}`);
  return data.data;
};

export const fetchLoan = async (id: string): Promise<Loan> => {
  const { data } = await api.get<ApiResponse<Loan>>(`/loans/${id}`);
  return data.data;
};

export const createLoan = async (input: CreateLoanInput): Promise<Loan> => {
  const { data } = await api.post<ApiResponse<Loan>>("/loans", input);
  return data.data;
};

export const updateLoan = async (id: string, input: UpdateLoanInput): Promise<Loan> => {
  const { data } = await api.put<ApiResponse<Loan>>(`/loans/${id}`, input);
  return data.data;
};

export const cancelLoan = async (id: string): Promise<Loan> => {
  const { data } = await api.post<ApiResponse<Loan>>(`/loans/${id}/cancel`);
  return data.data;
};

export const addRepayment = async (loanId: string, input: AddRepaymentInput): Promise<LoanRepayment> => {
  const { data } = await api.post<ApiResponse<LoanRepayment>>(`/loans/${loanId}/repayments`, input);
  return data.data;
};
