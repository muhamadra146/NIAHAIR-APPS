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
