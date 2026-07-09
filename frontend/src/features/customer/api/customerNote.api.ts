import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CustomerNote } from "../types";

export async function fetchCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  const { data } = await api.get<ApiResponse<CustomerNote[]>>(`/customers/${customerId}/notes`);
  return data.data;
}

export async function createCustomerNote(customerId: string, note: string): Promise<CustomerNote> {
  const { data } = await api.post<ApiResponse<CustomerNote>>(`/customers/${customerId}/notes`, { note });
  return data.data;
}

export async function deleteCustomerNote(customerId: string, noteId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/notes/${noteId}`);
}
