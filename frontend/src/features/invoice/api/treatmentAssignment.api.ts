import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { TreatmentSession, TreatmentAssignment } from "@/features/appointment/types";

export const SLOT_OPTIONS = [
  { key: "pemasang", label: "Pemasang" },
  { key: "asisten",  label: "Asisten"  },
  { key: "colorist", label: "Colorist" },
];

export async function setupTreatment(invoiceId: string): Promise<TreatmentSession> {
  const { data } = await api.post<ApiResponse<TreatmentSession>>(`/invoices/${invoiceId}/setup-treatment`);
  return data.data;
}

export async function createAssignment(
  treatmentItemId: string,
  body: { employeeId: string; slotKey: string; workQty: number; notes?: string },
): Promise<TreatmentAssignment> {
  const { data } = await api.post<ApiResponse<TreatmentAssignment>>(
    `/treatment-items/${treatmentItemId}/assignments`,
    body,
  );
  return data.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/treatment-assignments/${id}`);
}

export async function generateCommission(invoiceId: string): Promise<{ created: number }> {
  const { data } = await api.post<ApiResponse<{ created: number }>>(`/invoices/${invoiceId}/generate-commission`);
  return data.data;
}

export async function regenerateCommission(invoiceId: string): Promise<{ created: number }> {
  const { data } = await api.post<ApiResponse<{ created: number }>>(`/commissions/invoice/${invoiceId}/regenerate`);
  return data.data;
}

export async function fetchTreatmentSession(invoiceId: string): Promise<TreatmentSession | null> {
  const { data } = await api.get<ApiResponse<{ data: TreatmentSession[] }>>("/treatment-sessions", {
    params: { invoiceId, limit: 1 },
  });
  return data.data?.data?.[0] ?? null;
}
