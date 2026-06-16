import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Membership, CreateMembershipInput, UpdateMembershipInput,
  MembershipListParams, CustomerMembershipRecord,
} from "../types";

export const fetchMemberships = async (params: MembershipListParams = {}): Promise<PaginatedResponse<Membership>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Membership>>>("/memberships", { params });
  return data.data;
};

export const fetchAllMemberships = async (): Promise<Membership[]> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<Membership>>>("/memberships", {
    params: { limit: 100 },
  });
  return data.data.data ?? [];
};

export const createMembership = async (input: CreateMembershipInput): Promise<Membership> => {
  const { data } = await api.post<ApiResponse<Membership>>("/memberships", input);
  return data.data;
};

export const updateMembership = async (id: string, input: UpdateMembershipInput): Promise<Membership> => {
  const { data } = await api.put<ApiResponse<Membership>>(`/memberships/${id}`, input);
  return data.data;
};

export const deleteMembership = async (id: string): Promise<void> => {
  await api.delete(`/memberships/${id}`);
};

export const fetchCustomerMembership = async (customerId: string) => {
  const { data } = await api.get<ApiResponse<{
    customer: { id: string; name: string };
    activeMembership: Membership | null;
    activeRecord: CustomerMembershipRecord | null;
  }>>(`/memberships/customers/${customerId}`);
  return data.data;
};

export const assignMembership = async (customerId: string, membershipId: string): Promise<CustomerMembershipRecord> => {
  const { data } = await api.post<ApiResponse<CustomerMembershipRecord>>(
    `/memberships/customers/${customerId}/assign`,
    { membershipId }
  );
  return data.data;
};

export const cancelCustomerMembership = async (customerId: string): Promise<CustomerMembershipRecord> => {
  const { data } = await api.post<ApiResponse<CustomerMembershipRecord>>(
    `/memberships/customers/${customerId}/cancel`
  );
  return data.data;
};
