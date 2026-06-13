export type CommissionStatus = "PENDING" | "APPROVED" | "PAID";
export type CommissionType   = "PERCENTAGE" | "FIXED";
export type CommissionBase   = "BEFORE_DISCOUNT" | "AFTER_DISCOUNT";

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
  status?:     CommissionStatus | string;
  startDate?:  string;
  endDate?:    string;
}
