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
  periodStart: string;
  periodEnd:   string;
  status:      PayrollStatus;
  baseSalary:  number;
  bpjsJht:     number;
  bpjsJp:      number;
  totalBpjs:   number;
}

export interface BpjsReportResult {
  data:    BpjsReportRow[];
  totals:  { baseSalary: number; bpjsJht: number; bpjsJp: number; totalBpjs: number };
  period:  { yearMonth: string; periodStart: string; periodEnd: string };
}

export interface BpjsReportParams {
  branchId?:  string;
  yearMonth:  string;
}
