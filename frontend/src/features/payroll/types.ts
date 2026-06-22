export type PayrollStatus   = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID";
export type PayrollItemType = "INCOME" | "DEDUCTION";

export interface PayrollItem {
  id:        string;
  payrollId: string;
  type:      PayrollItemType;
  category:  string;
  label:     string;
  amount:    number;
  quantity:  number | null;
  rate:      number | null;
  isAuto:    boolean;
  notes:     string | null;
}

export interface CommissionBreakdownItem {
  id:               string;
  commissionAmount: number;
  approvedAt:       string;
  treatmentName:    string;
}

export interface Payroll {
  id:             string;
  employeeId:     string;
  branchId:       string;
  periodStart:    string;
  periodEnd:      string;
  status:         PayrollStatus;
  grossIncome:    number;
  totalDeductions: number;
  netSalary:      number;
  approvedBy:     string | null;
  approvedAt:     string | null;
  paidAt:         string | null;
  notes:          string | null;
  createdAt:      string;
  updatedAt:      string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { id: string; code: string; name: string };
    homeBranch:   { id: string; code: string; name: string } | null;
  };
  branch: { id: string; code: string; name: string };
  items:  PayrollItem[];
  commissionBreakdown?: CommissionBreakdownItem[];
}

export interface GeneratePayrollInput {
  employeeId:   string;
  branchId:     string;
  yearMonth?:   string;
  periodStart?: string;
  periodEnd?:   string;
  notes?:       string;
}

export interface PayrollListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  branchId?:   string;
  status?:     PayrollStatus;
  yearMonth?:  string;
}

export interface BpjsReportRow {
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { name: string };
  };
  periodStart:           string;
  periodEnd:             string;
  status:                PayrollStatus;
  baseSalary:            number;
  bpjsJht:               number;
  bpjsJhtEmployer:       number;
  bpjsJp:                number;
  bpjsJpEmployer:        number;
  bpjsKesehatan:         number;
  bpjsKesehatanEmployer: number;
  totalEmployee:         number;
  totalEmployer:         number;
  totalBpjs:             number;
}

export interface BpjsReportTotals {
  baseSalary:            number;
  bpjsJht:               number;
  bpjsJhtEmployer:       number;
  bpjsJp:                number;
  bpjsJpEmployer:        number;
  bpjsKesehatan:         number;
  bpjsKesehatanEmployer: number;
  totalEmployee:         number;
  totalEmployer:         number;
  totalBpjs:             number;
}

export interface BpjsReportResult {
  data:    BpjsReportRow[];
  totals:  BpjsReportTotals;
  period:  { yearMonth: string; periodStart: string; periodEnd: string };
}

export interface BpjsReportParams {
  branchId?:  string;
  yearMonth:  string;
}

export interface BulkGenerateInput {
  branchId:  string;
  payDay?:   number;
  yearMonth: string;
  notes?:    string;
}

export interface BulkGenerateResult {
  summary: { total: number; created: number; errors: number };
  results: Array<{
    employeeId:   string;
    employeeName: string;
    status:       "created" | "error";
    message?:     string;
    payrollId?:   string;
  }>;
}
