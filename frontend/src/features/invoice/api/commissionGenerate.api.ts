import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

// ── Job Assignment Invoice types ──────────────────────────────────────

export interface AppointmentStaffRef {
  id:       string;
  slotKey:  string | null;
  employee: { id: string; name: string; employeeCode: string };
}

export interface JobAssignmentRef {
  id:               string;
  employeeId:       string | null;
  workQty:          string | null;
  // Old system (serviceJobRole)
  serviceJobSlotId: string | null;
  serviceJobSlot: {
    id:            string;
    isMainJob:     boolean;
    commissionMode: string;
    serviceJobRole: { id: string; roleName: string; commissionRate: string } | null;
  } | null;
  // New system (commissionJob)
  commissionJobId: string | null;
  commissionJob:   { id: string; name: string; jobKey: string } | null;
  employee: { id: string; name: string; employeeCode: string } | null;
}

export interface ServiceJobRoleWithMainSlot {
  id:             string;
  roleName:       string;
  commissionRate: string;
  slots: Array<{ id: string; slotKey: string; commissionMode: string; isMainJob: true }>;
}

export interface CommissionJobRef {
  id:               string;
  name:             string;
  jobKey:           string;
  sortOrder:        number;
  pricePerUnit:     string | null;   // null = primary atau FLAT helper
  deductsFromJobId: string | null;   // null = primary; ada isi = helper
}

export interface ItemCommissionCategory {
  id:   string;
  code: string;
  name: string;
  jobs: CommissionJobRef[];
}

export interface JobAssignmentTreatmentItem {
  id:                 string;
  qty:                string | null;   // qty dalam satuan item (mis: 1 TEBAL)
  conversionSnapshot: string | null;   // konversi unit → helai (mis: 180 = 1 TEBAL = 180 helai)
  subtotal:           string | null;
  unit:               { id: string; name: string } | null;
  item: {
    id:                  string;
    name:                string;
    itemCode:            string;
    itemType:            string;
    commissionCategoryId: string | null;
    commissionCategory:  ItemCommissionCategory | null;
    serviceJobRoles:     ServiceJobRoleWithMainSlot[];
  };
  jobAssignments: JobAssignmentRef[];
}

export interface JobAssignmentSession {
  id:          string;
  appointment: { staffs: AppointmentStaffRef[] } | null;
  treatmentItems: JobAssignmentTreatmentItem[];
}

export interface JobAssignmentInvoice {
  id:          string;
  invoiceNo:   string;
  invoiceDate: string;
  grandTotal:  string;
  customer:    { id: string; name: string; customerNo: string };
  treatmentSessions: JobAssignmentSession[];
  commissions: { id: string; status: string }[];
  _count:      { commissions: number };
}

export interface SubmitJobAssignmentsPayload {
  sessions: Array<{
    sessionId:   string;
    assignments: Array<{
      treatmentItemId:  string;
      // One of these must be set:
      serviceJobSlotId?: string | null;  // old system
      commissionJobId?:  string | null;  // new system
      employeeId:        string;
      workQty?:          number | null;
    }>;
  }>;
}

export interface SubmitJobAssignmentsResult {
  assigned:           number;
  commissionsCreated: number;
  needsCalculator?:   boolean;
}

export interface CommissionGenerateInvoice {
  id:                string;
  invoiceNo:         string;
  invoiceDate:       string;
  grandTotal:        string;
  commissionSkipped: boolean;
  customer: { id: string; name: string; customerNo: string };
  branch:   { id: string; name: string };
  _count:   { commissions: number };
}

export interface CommissionGenerateListData {
  data: CommissionGenerateInvoice[];
  meta: PaginatedResponse<CommissionGenerateInvoice>["meta"];
}

export interface CommissionGenerateListParams {
  page?:      number;
  limit?:     number;
  branchId?:  string;
  startDate?: string;
  endDate?:   string;
}

export async function fetchCommissionGenerateList(
  params: CommissionGenerateListParams = {},
): Promise<CommissionGenerateListData> {
  const { data } = await api.get<ApiResponse<CommissionGenerateListData>>(
    "/invoices/commission-generate",
    { params },
  );
  return data.data;
}

export async function skipCommission(invoiceId: string): Promise<{ id: string; commissionSkipped: boolean }> {
  const { data } = await api.post<ApiResponse<{ id: string; commissionSkipped: boolean }>>(
    `/invoices/${invoiceId}/skip-commission`,
  );
  return data.data;
}

export async function resetCommissionSkip(invoiceId: string): Promise<{ id: string; commissionSkipped: boolean }> {
  const { data } = await api.post<ApiResponse<{ id: string; commissionSkipped: boolean }>>(
    `/invoices/${invoiceId}/reset-commission-skip`,
  );
  return data.data;
}

// ── Job Assignment Invoices ────────────────────────────────────────────

export interface FetchJobAssignmentParams {
  branchId?:  string;
  startDate?: string;
  endDate?:   string;
}

export async function fetchJobAssignmentInvoices(
  params: FetchJobAssignmentParams = {},
): Promise<JobAssignmentInvoice[]> {
  const { data } = await api.get<ApiResponse<JobAssignmentInvoice[]>>(
    "/invoices/job-assignments",
    { params },
  );
  return data.data;
}

export async function submitJobAssignments(
  invoiceId: string,
  payload:   SubmitJobAssignmentsPayload,
): Promise<SubmitJobAssignmentsResult> {
  const { data } = await api.post<ApiResponse<SubmitJobAssignmentsResult>>(
    `/invoices/${invoiceId}/submit-job-assignments`,
    payload,
  );
  return data.data;
}

// ── Commission Calculator / Worksheet ────────────────────────────────

export interface WorksheetWorker {
  treatmentJobAssignmentId: string;
  employeeId:               string;
  employeeName:             string;
  workQty:                  number | null;
  commissionRuleId:         string | null;
  commissionType:           "PERCENTAGE" | "FIXED" | null;
  commissionValue:          string | null;   // "1.0" = 1%
  commissionBase:           string | null;
  baseAmount:               number;          // InvoiceItem.subtotal resolved by backend (full item base)
  // Computed by chain calculation on frontend — effective base setelah chain deduction
  effectiveBase?:           number;
}

export interface WorksheetJob {
  commissionJobId:  string;
  jobName:          string;
  jobKey:           string;
  sortOrder:        number;
  // Chain deduction fields — dikirim dari backend, dipakai frontend untuk chain calc
  deductsFromJobId: string | null;   // null = primary; diisi = helper job
  pricePerUnit:     number | null;   // harga default/unit untuk PERCENTAGE helper
  unit:             string;          // satuan: "helai", "sesi", "cm", dll.
  workers:          WorksheetWorker[];
}

export interface WorksheetTreatmentItem {
  treatmentItemId: string;
  itemId:          string;
  itemName:        string;
  subtotal:        string;
  qty:             number | null;   // qty item dari invoice (max helai untuk primary workers)
  categoryId:      string;
  categoryName:    string;
  jobs:            WorksheetJob[];
}

export interface CommissionWorksheet {
  invoiceId:      string;
  invoiceNo:      string;
  grandTotal:     string;
  customer:       { id: string; name: string };
  treatmentItems: WorksheetTreatmentItem[];
  commissions:    { id: string; status: string }[];
}

export interface FinalizeCommissionRow {
  treatmentJobAssignmentId: string;
  commissionAmount:         number;
  commissionRuleId:         string | null;
  commissionType:           string;
  commissionValue:          string;
  commissionBase:           string;
  baseAmount:               number;
  workQty:                  number | null;
  workRatio:                number | null;
  notes:                    string | null;
}

export interface FinalizeCommissionPayload {
  rows: FinalizeCommissionRow[];
}

export interface FinalizeCommissionResult {
  created: number;
}

export async function fetchCommissionWorksheet(invoiceId: string): Promise<CommissionWorksheet> {
  const { data } = await api.get<ApiResponse<CommissionWorksheet>>(
    `/invoices/${invoiceId}/commission-worksheet`,
  );
  return data.data;
}

export async function finalizeCommission(
  invoiceId: string,
  payload:   FinalizeCommissionPayload,
): Promise<FinalizeCommissionResult> {
  const { data } = await api.post<ApiResponse<FinalizeCommissionResult>>(
    `/invoices/${invoiceId}/finalize-commission`,
    payload,
  );
  return data.data;
}
