import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Complaint, ComplaintStats, CreateComplaintInput, UpdateComplaintInput, ComplaintListParams } from "./types";

export async function fetchComplaintStats(params: { branchId?: string } = {}): Promise<ComplaintStats> {
  const { data } = await api.get<ApiResponse<ComplaintStats>>("/complaints/stats", { params });
  return data.data;
}

export async function fetchComplaints(params: ComplaintListParams = {}): Promise<PaginatedResponse<Complaint>> {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Complaint>>>("/complaints", { params });
  return data.data;
}

export async function fetchComplaint(id: string): Promise<Complaint> {
  const { data } = await api.get<ApiResponse<Complaint>>(`/complaints/${id}`);
  return data.data;
}

export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const { data } = await api.post<ApiResponse<Complaint>>("/complaints", input);
  return data.data;
}

export async function updateComplaint(id: string, input: UpdateComplaintInput): Promise<Complaint> {
  const { data } = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}`, input);
  return data.data;
}

export async function deleteComplaint(id: string): Promise<void> {
  await api.delete(`/complaints/${id}`);
}
