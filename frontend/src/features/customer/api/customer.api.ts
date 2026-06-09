import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Customer,
  CustomerListParams,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../types";

export async function fetchCustomers(params: CustomerListParams = {}): Promise<PaginatedResponse<Customer>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Customer>>>("/customers", { params });
  return data.data;
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data } = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
  return data.data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await api.post<ApiResponse<{ customer: Customer; message: string }>>("/customers", input);
  return data.data.customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const { data } = await api.put<ApiResponse<Customer>>(`/customers/${id}`, input);
  return data.data;
}
