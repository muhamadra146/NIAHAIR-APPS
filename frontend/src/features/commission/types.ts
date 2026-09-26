export type CommissionStatus = "PENDING" | "APPROVED" | "PAID";

// ── Commission Category ───────────────────────────────────────────────────────

export interface CommissionCategory {
  id:        string;
  code:      string;
  name:      string;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionCategoryListParams {
  page?:     number;
  limit?:    number;
  search?:   string;
  isActive?: boolean;
}

export interface CreateCommissionCategoryInput {
  code:      string;
  name:      string;
  isActive?: boolean;
}

export interface UpdateCommissionCategoryInput {
  code?:     string;
  name?:     string;
  isActive?: boolean;
}

// ── Commission Job ────────────────────────────────────────────────────────────

export interface CommissionJob {
  id:                   string;
  commissionCategoryId: string;
  name:                 string;
  jobKey:               string;
  sortOrder:            number;
  isActive:             boolean;
  // Chain deduction — null = job utama (primary), diisi = helper job
  deductsFromJobId:     string | null;
  pricePerUnit:         string | null;  // Decimal as string from API; harga/unit untuk PERCENTAGE helper
  unit:                 string;         // satuan: "helai", "sesi", "cm", dll.
  // staffCountMax: batas jumlah staff untuk rate dinamis (HS).
  // null = berlaku ketika jumlah staff melebihi semua job yang punya staffCountMax.
  staffCountMax:        number | null;
  deductsFrom?:         { id: string; name: string } | null;
  createdAt:            string;
  updatedAt:            string;
}

export interface CreateCommissionJobInput {
  name:               string;
  jobKey?:            string;
  sortOrder?:         number;
  deductsFromJobId?:  string | null;
  pricePerUnit?:      number | null;
  unit?:              string;
  staffCountMax?:     number | null;  // batas staff untuk HS dynamic rate
}

export interface UpdateCommissionJobInput {
  name?:              string;
  sortOrder?:         number;
  isActive?:          boolean;
  deductsFromJobId?:  string | null;
  pricePerUnit?:      number | null;
  unit?:              string;
  staffCountMax?:     number | null;  // batas staff untuk HS dynamic rate
}

// ── Commission Rule ───────────────────────────────────────────────────────────

export interface CommissionRuleEmployee {
  id:           string;
  name:         string;
  employeeCode: string | null;
}

export interface CommissionRuleCategory {
  id:   string;
  code: string;
  name: string;
}

export interface CommissionRule {
  id:                   string;
  employeeId:           string;
  commissionCategoryId: string;
  slotKey:              string | null;
  commissionJobId:      string | null;
  commissionType:       CommissionType;
  commissionValue:      string | number;
  commissionBase:       CommissionBase;
  effectiveDate:        string;
  endDate:              string | null;
  isActive:             boolean;
  createdAt:            string;
  updatedAt:            string;
  employee?:            CommissionRuleEmployee;
  commissionCategory?:  CommissionRuleCategory;
  commissionJob?:       CommissionJob | null;
}

export interface CommissionRuleListParams {
  page?:                number;
  limit?:               number;
  search?:              string;
  employeeId?:          string;
  commissionCategoryId?: string;
  isActive?:            boolean;
}

export interface CreateCommissionRuleInput {
  employeeId:           string;
  commissionCategoryId: string;
  slotKey?:             string | null;
  commissionJobId?:     string | null;
  commissionType:       CommissionType;
  commissionValue:      number;
  commissionBase?:      CommissionBase;
  effectiveDate:        string;
  endDate?:             string | null;
  isActive?:            boolean;
}

export interface UpdateCommissionRuleInput {
  commissionType?:  CommissionType;
  commissionValue?: number;
  commissionBase?:  CommissionBase;
  effectiveDate?:   string;
  endDate?:         string | null;
  isActive?:        boolean;
}

// ── Master Item (for commission category assignment) ──────────────────────────

export interface MasterItem {
  id:                   string;
  itemCode:             string;
  name:                 string;
  itemType:             string;
  isActive:             boolean;
  commissionCategoryId: string | null;
  commissionCategory?:  CommissionRuleCategory | null;
}

export interface MasterItemListParams {
  page?:     number;
  limit?:    number;
  search?:   string;
  isActive?: boolean;
  itemType?: string;
}

export interface UpdateItemCommissionInput {
  commissionCategoryId: string | null;
}

// ── Service Job Slots ─────────────────────────────────────────────────────────

export type CommissionMode = "FIXED_RATE" | "WORK_QTY";
export type SlotType       = "PERCENTAGE" | "FLAT";

export interface ServiceJobSlot {
  id:             string;
  itemId:         string;
  slotKey:        string;
  label:          string;
  commissionRate: string;       // Decimal as string from backend
  commissionMode: CommissionMode;
  // Role-based fields (null = slot lama, backward compat)
  roleId?:        string | null;
  isMainJob?:     boolean;
  slotType?:      SlotType;
  isRequired:     boolean;
  sortOrder:      number;
  isActive:       boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface CreateServiceJobSlotInput {
  slotKey:         string;
  label:           string;
  commissionRate:  number;
  commissionMode?: CommissionMode;
  // Role-based fields (optional)
  roleId?:         string | null;
  isMainJob?:      boolean;
  slotType?:       SlotType;
  isRequired?:     boolean;
  sortOrder?:      number;
}

export interface UpdateServiceJobSlotInput {
  slotKey?:        string;
  label?:          string;
  commissionRate?: number;
  commissionMode?: CommissionMode;
  roleId?:         string | null;
  isMainJob?:      boolean;
  slotType?:       SlotType;
  isRequired?:     boolean;
  sortOrder?:      number;
  isActive?:       boolean;
}

// ── Service Job Roles ─────────────────────────────────────────────────────────

export interface ServiceJobRole {
  id:             string;
  itemId:         string;
  roleName:       string;
  commissionRate: string;   // Decimal as string from backend
  sortOrder:      number;
  isActive:       boolean;
  createdAt:      string;
  updatedAt:      string;
  slots?:         ServiceJobSlot[];
}

export interface CreateServiceJobRoleInput {
  roleName:       string;
  commissionRate: number;
  sortOrder?:     number;
}

export interface UpdateServiceJobRoleInput {
  roleName?:       string;
  commissionRate?: number;
  sortOrder?:      number;
  isActive?:       boolean;
}
export type CommissionType   = "PERCENTAGE" | "FIXED";
export type CommissionBase   =
  | "BEFORE_DISCOUNT_BEFORE_TAX"
  | "AFTER_DISCOUNT_BEFORE_TAX"
  | "BEFORE_DISCOUNT_AFTER_TAX"
  | "AFTER_DISCOUNT_AFTER_TAX"
  | "BEFORE_DISCOUNT"   // legacy
  | "AFTER_DISCOUNT";   // legacy

export interface CommissionEmployee {
  id:           string;
  name:         string;
  employeeCode: string | null;
}

export interface CommissionInvoiceItem {
  id:       string;
  itemId:   string;
  qty:      number | string;
  price:    number | string;
  subtotal: number | string;
}

// Ringkasan invoice yang disertakan di response komisi (untuk per-invoice grouping)
export interface CommissionInvoiceSummary {
  invoiceNo:   string;
  invoiceDate: string;
  grandTotal:  string;
  customer:    { name: string };
}

export interface Commission {
  id:                   string;
  invoiceId:            string;
  invoiceItemId:        string | null;
  treatmentAssignmentId: string | null;
  employeeId:           string;
  serviceItemId:        string;
  commissionRuleId:     string;
  commissionType:       CommissionType;
  commissionValue:      number | string;
  commissionBase:       CommissionBase;
  workQty:              number | string;
  workRatio:            number | string;
  baseAmount:           number | string;
  commissionAmount:     number | string;
  status:               CommissionStatus;
  isForfeit:            boolean;
  forfeitReason:        string | null;
  isManualOverride:     boolean;
  overrideBy:           string | null;
  overrideAt:           string | null;
  overrideNotes:        string | null;
  approvedAt:           string | null;
  approvedById:         string | null;
  paidAt:               string | null;
  paidById:             string | null;
  createdAt:            string;
  updatedAt:            string;
  employee:             CommissionEmployee | null;
  invoiceItem:          CommissionInvoiceItem | null;
  invoice:              CommissionInvoiceSummary | null;  // ringkasan invoice
}

export interface CommissionListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  branchId?:   string;
  invoiceId?:  string;
  status?:     CommissionStatus | string;
  startDate?:  string;
  endDate?:    string;
}
