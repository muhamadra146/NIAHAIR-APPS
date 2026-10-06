import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { CommissionSplitMode, CommissionDefaultQty } from "@/features/commission/types";

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
  commissionJobId: string | null;
  commissionJob:   { id: string; name: string; jobKey: string } | null;
  employee: { id: string; name: string; employeeCode: string } | null;
}

export interface CommissionJobRef {
  id:               string;
  name:             string;
  jobKey:           string;
  sortOrder:        number;
  pricePerUnit:     string | null;   // null = primary atau FLAT helper
  deductsFromJobId: string | null;   // null = primary; ada isi = helper
  unit:             string;          // satuan (label): "helai", "kepala", "sesi", …
  splitMode:        CommissionSplitMode;
  defaultQty:       CommissionDefaultQty;  // qty otomatis saat dicentang
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
  customer:    { id: string; name: string; customerNo: string; mobilePhone: string | null };
  treatmentSessions: JobAssignmentSession[];
  commissions: { id: string; status: string }[];
  _count:      { commissions: number };
  /** COM-014: Catatan Klien wajib ada sebelum Input Job */
  consultationNote: { id: string } | null;
  /** Invoice pertama pelanggan → form Catatan Klien lengkap; selain itu form ringkas */
  isNewClient:      boolean;
}

export interface SubmitJobAssignmentsPayload {
  sessions: Array<{
    sessionId:   string;
    assignments: Array<{
      treatmentItemId:  string;
      commissionJobId:  string;
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

// Hasil kalkulasi dihitung backend (commission.calc.calcCategoryItem) — satu sumber
// untuk kalkulator, finalize, dan regenerate. Frontend hanya menampilkan.

/** PRIMARY = job utama; HELPER_UNIT = helper qty × harga/unit; HELPER_FLAT = helper nominal flat */
export type CalcJobRole = "PRIMARY" | "HELPER_UNIT" | "HELPER_FLAT";

export interface WorksheetRow {
  treatmentJobAssignmentId: string;
  employeeId:               string;
  employeeName:             string;
  commissionRuleId:         string | null;
  commissionType:           "PERCENTAGE" | "FIXED" | null;
  commissionValue:          string | null;   // "10" = 10% atau nominal Rp (FIXED)
  commissionBase:           string | null;
  hasRule:                  boolean;         // false = staf belum punya tarif (rule maupun tarif job)
  rateSource?:              "RULE" | "JOB" | null; // RULE = rule karyawan, JOB = tarif bawaan job
  itemBase:                 number;          // base item menurut commissionBase rule staf
  remainingBase?:           number;          // primary: base item staf − potongan base helper
  workQty:                  number;
  workRatio:                number | null;   // porsi staf (primary); null untuk helper
  effectiveBase:            number;          // base milik staf (sisa base × porsi / qty × harga)
  grossAmount:              number;          // komisi sebelum potongan flat
  flatDeduction:            number;          // potongan helper flat (bagian staf ini)
  amount:                   number;          // komisi hitungan sistem
}

export interface WorksheetJob {
  commissionJobId:  string;
  jobName:          string;
  jobKey:           string;
  sortOrder:        number;
  deductsFromJobId: string | null;   // null = primary; diisi = helper job
  pricePerUnit:     number | null;
  unit:             string;          // satuan (label)
  splitMode:        CommissionSplitMode;
  role:             CalcJobRole;
  // primary only
  remainingBase?:   number;          // subtotal − potongan base helper
  baseDeduction?:   number;
  flatDeduction?:   number;
  rows:             WorksheetRow[];
}

export interface WorksheetTreatmentItem {
  treatmentItemId: string;
  itemId:          string;
  itemName:        string;
  invoiceItemId:   string | null;
  subtotal:        string;
  qty:             number | null;   // qty item dalam satuan konversi (mis. 180 helai)
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

/** key: treatmentJobAssignmentId */
export type QtyOverrides    = Record<string, number>;
export type AmountOverrides = Record<string, number>;

export interface FinalizeCommissionPayload {
  qtyOverrides:    QtyOverrides;     // koreksi qty (backend menghitung ulang)
  amountOverrides: AmountOverrides;  // koreksi nominal manual (tercatat sebagai manual override)
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

/** Preview kalkulasi dengan koreksi qty — tidak menyimpan apa pun */
export async function calculateCommissionWorksheet(
  invoiceId:    string,
  qtyOverrides: QtyOverrides,
): Promise<CommissionWorksheet> {
  const { data } = await api.post<ApiResponse<CommissionWorksheet>>(
    `/invoices/${invoiceId}/commission-worksheet/calculate`,
    { qtyOverrides },
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
