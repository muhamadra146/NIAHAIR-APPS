import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Membership, CreateMembershipInput, UpdateMembershipInput } from "./types";

interface MembershipListData {
  data: Membership[];
  meta: PaginatedResponse<Membership>["meta"];
}

export async function fetchMemberships(params?: { page?: number; limit?: number }): Promise<MembershipListData> {
  const { data } = await api.get<ApiResponse<MembershipListData>>("/memberships", { params });
  return data.data;
}

export async function fetchMembership(id: string): Promise<Membership> {
  const { data } = await api.get<ApiResponse<Membership>>(`/memberships/${id}`);
  return data.data;
}

export async function createMembership(input: CreateMembershipInput): Promise<Membership> {
  const { data } = await api.post<ApiResponse<Membership>>("/memberships", input);
  return data.data;
}

export async function updateMembership(id: string, input: UpdateMembershipInput): Promise<Membership> {
  const { data } = await api.put<ApiResponse<Membership>>(`/memberships/${id}`, input);
  return data.data;
}

export async function deleteMembership(id: string): Promise<void> {
  await api.delete(`/memberships/${id}`);
}
