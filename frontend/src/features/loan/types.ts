export type LoanStatus = "ACTIVE" | "PAID" | "CANCELLED";

export interface LoanEmployee {
  id:           string;
  name:         string;
  employeeCode: string | null;
  role:         { id: string; code: string; name: string } | null;
}

export interface LoanBranch {
  id:   string;
  code: string;
  name: string;
}

export interface LoanRepayment {
  id:        string;
  loanId:    string;
  amount:    number | string;
  paidAt:    string;
  notes:     string | null;
  payrollId: string | null;
  createdAt: string;
}

export interface Loan {
  id:               string;
  employeeId:       string;
  branchId:         string;
  loanNo:           string;
  totalAmount:      number | string;
  remainingAmount:  number | string;
  monthlyDeduction: number | string;
  startDate:        string;
  endDate:          string | null;
  status:           LoanStatus;
  notes:            string | null;
  createdAt:        string;
  updatedAt:        string;
  employee:         LoanEmployee | null;
  branch:           LoanBranch | null;
  repayments:       LoanRepayment[];
}

export interface LoanListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  status?:     LoanStatus | string;
  branchId?:   string;
}

export interface CreateLoanInput {
  employeeId:       string;
  branchId:         string;
  totalAmount:      number;
  monthlyDeduction: number;
  startDate:        string;
  endDate?:         string;
  notes?:           string;
}

export interface UpdateLoanInput {
  monthlyDeduction?: number;
  endDate?:          string;
  notes?:            string;
}

export interface AddRepaymentInput {
  amount:     number;
  paidAt:     string;
  notes?:     string;
  payrollId?: string;
}
