import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Commission, CommissionListParams,
  CommissionCategory, CommissionCategoryListParams, CreateCommissionCategoryInput, UpdateCommissionCategoryInput,
  CommissionRule, CommissionRuleListParams, CreateCommissionRuleInput, UpdateCommissionRuleInput,
  MasterItem, MasterItemListParams, UpdateItemCommissionInput,
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
