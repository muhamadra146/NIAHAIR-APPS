import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { PaymentMethod, PaymentMethodListParams, CreatePaymentMethodInput, UpdatePaymentMethodInput } from "../types";

export const fetchPaymentMethods = async (params: PaymentMethodListParams = {}): Promise<PaginatedResponse<PaymentMethod>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<PaymentMethod>>>("/payment-methods", { params });
  return data.data;
};

export const createPaymentMethod = async (input: CreatePaymentMethodInput): Promise<PaymentMethod> => {
  const { data } = await api.post<ApiResponse<PaymentMethod>>("/payment-methods", input);
  return data.data;
};

export const updatePaymentMethod = async (id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> => {
  const { data } = await api.put<ApiResponse<PaymentMethod>>(`/payment-methods/${id}`, input);
  return data.data;
};

export const deletePaymentMethod = async (id: string): Promise<void> => {
  await api.delete(`/payment-methods/${id}`);
};
