import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  TreatmentSession,
  TreatmentItem,
  TreatmentAssignment,
  TreatmentListParams,
  CreateTreatmentInput,
  UpdateTreatmentInput,
  CreateTreatmentItemInput,
  UpdateTreatmentItemInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  ItemSearchResult,
  UnitOption,
  ServiceMaterial,
  MaterialUsageItem,
  BulkSaveMaterialUsageRow,
} from "./types";

interface TreatmentListData {
  data: TreatmentSession[];
  meta: { total: number; currentPage: number; limit: number };
}

// ── Treatment Sessions ────────────────────────────────────────────────────────

export async function fetchTreatments(params: TreatmentListParams = {}): Promise<TreatmentListData> {
  const { data } = await api.get<ApiResponse<TreatmentListData>>("/treatment-sessions", { params });
  return data.data;
}

export async function fetchTreatment(id: string): Promise<TreatmentSession> {
  const { data } = await api.get<ApiResponse<TreatmentSession>>(`/treatment-sessions/${id}`);
  return data.data;
}

export async function createTreatment(input: CreateTreatmentInput): Promise<TreatmentSession> {
  const { data } = await api.post<ApiResponse<TreatmentSession>>("/treatment-sessions", input);
  return data.data;
}

export async function updateTreatment(id: string, input: UpdateTreatmentInput): Promise<TreatmentSession> {
  const { data } = await api.put<ApiResponse<TreatmentSession>>(`/treatment-sessions/${id}`, input);
  return data.data;
}

// ── Treatment Items ───────────────────────────────────────────────────────────

export async function fetchTreatmentItems(sessionId: string): Promise<TreatmentItem[]> {
  const { data } = await api.get<ApiResponse<TreatmentItem[]>>(`/treatment-sessions/${sessionId}/items`);
  return data.data;
}

export async function createTreatmentItem(sessionId: string, input: CreateTreatmentItemInput): Promise<TreatmentItem> {
  const { data } = await api.post<ApiResponse<TreatmentItem>>(`/treatment-sessions/${sessionId}/items`, input);
  return data.data;
}

export async function updateTreatmentItem(sessionId: string, itemId: string, input: UpdateTreatmentItemInput): Promise<TreatmentItem> {
  const { data } = await api.put<ApiResponse<TreatmentItem>>(`/treatment-sessions/${sessionId}/items/${itemId}`, input);
  return data.data;
}

export async function deleteTreatmentItem(sessionId: string, itemId: string): Promise<void> {
  await api.delete(`/treatment-sessions/${sessionId}/items/${itemId}`);
}

// ── Treatment Assignments ─────────────────────────────────────────────────────

export async function fetchAssignments(sessionId: string, itemId: string): Promise<TreatmentAssignment[]> {
  const { data } = await api.get<ApiResponse<TreatmentAssignment[]>>(
    `/treatment-items/${itemId}/assignments`,
  );
  return data.data;
}

export async function createAssignment(
  sessionId: string,
  itemId: string,
  input: CreateAssignmentInput,
): Promise<TreatmentAssignment> {
  const { data } = await api.post<ApiResponse<TreatmentAssignment>>(
    `/treatment-items/${itemId}/assignments`,
    input,
  );
  return data.data;
}

export async function updateAssignment(
  sessionId: string,
  itemId: string,
  assignmentId: string,
  input: UpdateAssignmentInput,
): Promise<TreatmentAssignment> {
  const { data } = await api.put<ApiResponse<TreatmentAssignment>>(
    `/treatment-assignments/${assignmentId}`,
    input,
  );
  return data.data;
}

export async function deleteAssignment(sessionId: string, itemId: string, assignmentId: string): Promise<void> {
  await api.delete(`/treatment-assignments/${assignmentId}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function searchItems(search: string): Promise<ItemSearchResult[]> {
  const { data } = await api.get<ApiResponse<{ data: ItemSearchResult[] }>>("/items", {
    params: { search: search || undefined, isActive: true, limit: 20, page: 1 },
  });
  return data.data.data ?? [];
}

export async function fetchUnits(): Promise<UnitOption[]> {
  const { data } = await api.get<ApiResponse<{ data: UnitOption[] }>>("/units", {
    params: { isActive: true, limit: 100 },
  });
  return data.data.data ?? [];
}

// ── Material Usage (Phase 2) ──────────────────────────────────────────────────

export async function fetchServiceMaterials(serviceItemId: string): Promise<ServiceMaterial[]> {
  const { data } = await api.get<ApiResponse<ServiceMaterial[]>>(
    `/items/${serviceItemId}/service-materials`,
  );
  return data.data ?? [];
}

export async function fetchMaterialUsages(sessionId: string): Promise<MaterialUsageItem[]> {
  const { data } = await api.get<ApiResponse<MaterialUsageItem[]>>(
    `/treatment-sessions/${sessionId}/material-usages`,
  );
  return data.data ?? [];
}

export async function bulkSaveMaterialUsages(
  sessionId: string,
  rows: BulkSaveMaterialUsageRow[],
): Promise<MaterialUsageItem[]> {
  const { data } = await api.post<ApiResponse<MaterialUsageItem[]>>(
    `/treatment-sessions/${sessionId}/material-usages/bulk`,
    { rows },
  );
  return data.data ?? [];
}

export async function deleteMaterialUsageItem(id: string): Promise<void> {
  await api.delete(`/material-usage-items/${id}`);
}
