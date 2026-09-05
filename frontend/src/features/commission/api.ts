import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Commission, CommissionListParams,
  CommissionCategory, CommissionCategoryListParams, CreateCommissionCategoryInput, UpdateCommissionCategoryInput,
  CommissionJob, CreateCommissionJobInput, UpdateCommissionJobInput,
  CommissionRule, CommissionRuleListParams, CreateCommissionRuleInput, UpdateCommissionRuleInput,
  MasterItem, MasterItemListParams, UpdateItemCommissionInput,
  ServiceJobSlot, CreateServiceJobSlotInput, UpdateServiceJobSlotInput,
  ServiceJobRole, CreateServiceJobRoleInput, UpdateServiceJobRoleInput,
} from "./types";

interface CommissionListData {
  data: Commission[];
  meta: PaginatedResponse<Commission>["meta"];
}

export async function fetchCommissions(params: CommissionListParams = {}): Promise<CommissionListData> {
  const { data } = await api.get<ApiResponse<CommissionListData>>("/commissions", { params });
  return data.data;
}

export async function fetchCommission(id: string): Promise<Commission> {
  const { data } = await api.get<ApiResponse<Commission>>(`/commissions/${id}`);
  return data.data;
}

export async function approveCommission(id: string): Promise<Commission> {
  const { data } = await api.patch<ApiResponse<Commission>>(`/commissions/${id}/approve`);
  return data.data;
}

export async function payCommission(id: string): Promise<Commission> {
  const { data } = await api.patch<ApiResponse<Commission>>(`/commissions/${id}/pay`);
  return data.data;
}

export async function overrideCommission(
  id: string,
  body: { commissionAmount: number; notes?: string },
): Promise<Commission> {
  const { data } = await api.patch<ApiResponse<Commission>>(`/commissions/${id}/override`, body);
  return data.data;
}

export async function regenerateCommission(invoiceId: string): Promise<{ created: number }> {
  const { data } = await api.post<ApiResponse<{ created: number }>>(`/commissions/invoice/${invoiceId}/regenerate`);
  return data.data;
}

export async function deleteCommission(id: string): Promise<void> {
  await api.delete(`/commissions/${id}`);
}

// ── Commission Categories ─────────────────────────────────────────────────────

interface CategoryListData { data: CommissionCategory[]; meta: PaginatedResponse<CommissionCategory>["meta"]; }

export async function fetchCommissionCategories(params: CommissionCategoryListParams = {}): Promise<CategoryListData> {
  const { data } = await api.get<ApiResponse<CategoryListData>>("/commission-categories", { params });
  return data.data;
}

export async function createCommissionCategory(input: CreateCommissionCategoryInput): Promise<CommissionCategory> {
  const { data } = await api.post<ApiResponse<CommissionCategory>>("/commission-categories", input);
  return data.data;
}

export async function updateCommissionCategory(id: string, input: UpdateCommissionCategoryInput): Promise<CommissionCategory> {
  const { data } = await api.put<ApiResponse<CommissionCategory>>(`/commission-categories/${id}`, input);
  return data.data;
}

export async function deleteCommissionCategory(id: string): Promise<void> {
  await api.delete(`/commission-categories/${id}`);
}

// ── Commission Jobs ───────────────────────────────────────────────────────────

export async function fetchCommissionJobs(categoryId: string, all = false): Promise<CommissionJob[]> {
  const { data } = await api.get<ApiResponse<{ data: CommissionJob[]; meta: unknown }>>(
    `/commission-categories/${categoryId}/jobs`,
    { params: { limit: 100, ...(all ? { all: "true" } : {}) } }
  );
  return data.data.data;
}

export async function createCommissionJob(categoryId: string, input: CreateCommissionJobInput): Promise<CommissionJob> {
  const { data } = await api.post<ApiResponse<CommissionJob>>(
    `/commission-categories/${categoryId}/jobs`, input
  );
  return data.data;
}

export async function updateCommissionJob(categoryId: string, id: string, input: UpdateCommissionJobInput): Promise<CommissionJob> {
  const { data } = await api.put<ApiResponse<CommissionJob>>(
    `/commission-categories/${categoryId}/jobs/${id}`, input
  );
  return data.data;
}

export async function deleteCommissionJob(categoryId: string, id: string): Promise<void> {
  await api.delete(`/commission-categories/${categoryId}/jobs/${id}`);
}

// ── Commission Rules ──────────────────────────────────────────────────────────

interface RuleListData { data: CommissionRule[]; meta: PaginatedResponse<CommissionRule>["meta"]; }

export async function fetchCommissionRules(params: CommissionRuleListParams = {}): Promise<RuleListData> {
  const { data } = await api.get<ApiResponse<RuleListData>>("/commission-rules", { params });
  return data.data;
}

export async function createCommissionRule(input: CreateCommissionRuleInput): Promise<CommissionRule> {
  const { data } = await api.post<ApiResponse<CommissionRule>>("/commission-rules", input);
  return data.data;
}

export async function updateCommissionRule(id: string, input: UpdateCommissionRuleInput): Promise<CommissionRule> {
  const { data } = await api.put<ApiResponse<CommissionRule>>(`/commission-rules/${id}`, input);
  return data.data;
}

export async function deleteCommissionRule(id: string): Promise<void> {
  await api.delete(`/commission-rules/${id}`);
}

// ── Master Items ──────────────────────────────────────────────────────────────

interface ItemListData { data: MasterItem[]; meta: PaginatedResponse<MasterItem>["meta"]; }

export async function fetchMasterItems(params: MasterItemListParams = {}): Promise<ItemListData> {
  const { data } = await api.get<ApiResponse<ItemListData>>("/items", { params });
  return data.data;
}

export async function updateItemCommission(id: string, input: UpdateItemCommissionInput): Promise<MasterItem> {
  const { data } = await api.put<ApiResponse<MasterItem>>(`/items/${id}`, input);
  return data.data;
}

// ── Service Job Slots ─────────────────────────────────────────────────────────

export async function fetchJobSlots(itemId: string, all = false): Promise<ServiceJobSlot[]> {
  const { data } = await api.get<ApiResponse<{ data: ServiceJobSlot[]; meta: unknown }>>(`/items/${itemId}/job-slots`, {
    params: { limit: 100, ...(all ? { all: "true" } : {}) },
  });
  return data.data.data;
}

export async function createJobSlot(itemId: string, input: CreateServiceJobSlotInput): Promise<ServiceJobSlot> {
  const { data } = await api.post<ApiResponse<ServiceJobSlot>>(`/items/${itemId}/job-slots`, input);
  return data.data;
}

export async function updateJobSlot(itemId: string, id: string, input: UpdateServiceJobSlotInput): Promise<ServiceJobSlot> {
  const { data } = await api.put<ApiResponse<ServiceJobSlot>>(`/items/${itemId}/job-slots/${id}`, input);
  return data.data;
}

export async function deleteJobSlot(itemId: string, id: string): Promise<ServiceJobSlot> {
  const { data } = await api.delete<ApiResponse<ServiceJobSlot>>(`/items/${itemId}/job-slots/${id}`);
  return data.data;
}

// ── Service Job Roles ─────────────────────────────────────────────────────────

export async function fetchJobRoles(itemId: string, all = false): Promise<ServiceJobRole[]> {
  const { data } = await api.get<ApiResponse<{ data: ServiceJobRole[]; meta: unknown }>>(`/items/${itemId}/job-roles`, {
    params: { limit: 100, ...(all ? { all: "true" } : {}) },
  });
  return data.data.data;
}

export async function createJobRole(itemId: string, input: CreateServiceJobRoleInput): Promise<ServiceJobRole> {
  const { data } = await api.post<ApiResponse<ServiceJobRole>>(`/items/${itemId}/job-roles`, input);
  return data.data;
}

export async function updateJobRole(itemId: string, id: string, input: UpdateServiceJobRoleInput): Promise<ServiceJobRole> {
  const { data } = await api.put<ApiResponse<ServiceJobRole>>(`/items/${itemId}/job-roles/${id}`, input);
  return data.data;
}

export async function deleteJobRole(itemId: string, id: string): Promise<ServiceJobRole> {
  const { data } = await api.delete<ApiResponse<ServiceJobRole>>(`/items/${itemId}/job-roles/${id}`);
  return data.data;
}
