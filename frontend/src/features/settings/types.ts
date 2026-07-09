// ── Branch ────────────────────────────────────────────────────────────
export interface Branch {
  id:           string;
  code:         string;
  name:         string;
  address:      string | null;
  city:         string | null;
  province:     string | null;
  phone:        string | null;
  latitude:     number | null;
  longitude:    number | null;
  radiusMeters: number;
  isActive:     boolean;
}

// ── Employee Role (job title) ──────────────────────────────────────────
export interface EmployeeRole {
  id:       string;
  code:     string;
  name:     string;
  isActive: boolean;
}

// ── Employee ──────────────────────────────────────────────────────────
export interface EmployeeBranchItem {
  id:        string;
  branchId:  string;
  isPrimary: boolean;
  isActive:  boolean;
  branch:    Pick<Branch, "id" | "code" | "name">;
}

export interface Employee {
  id:               string;
  name:             string;
  employeeCode:     string | null;
  phone:            string | null;
  email:            string | null;
  roleId:           string;
  homeBranchId:     string | null;
  isActive:         boolean;
  createdAt:        string;
  updatedAt:        string;
  role:             Pick<EmployeeRole, "id" | "code" | "name">;
  homeBranch:       Pick<Branch, "id" | "code" | "name"> | null;
  employeeBranches: EmployeeBranchItem[];
}

// ── User Role (system permission) ─────────────────────────────────────
export interface UserRole {
  id:       string;
  code:     string;
  name:     string;
  isActive: boolean;
}

// ── User (system account) ─────────────────────────────────────────────
export interface User {
  id:         string;
  email:      string;
  username:   string | null;
  employeeId: string;
  isActive:   boolean;
  role:       Pick<UserRole, "id" | "code" | "name">;
  employee:   Pick<Employee, "id" | "name" | "employeeCode">;
}

// ── Cash Account ──────────────────────────────────────────────────────
export interface CashAccount {
  id:                string;
  code:              string;
  name:              string;
  accurateAccountId: number | null;
  accurateAccountNo: string | null;
  isActive:          boolean;
}

// ── Payment Method ────────────────────────────────────────────────────
export interface PaymentMethod {
  id:            string;
  code:          string;
  name:          string;
  cashAccountId: string | null;
  isActive:      boolean;
  cashAccount:   Pick<CashAccount, "id" | "code" | "name"> | null;
}

// ── Warehouse ─────────────────────────────────────────────────────────
export interface Warehouse {
  id:                  string;
  name:                string;
  accurateWarehouseId: number | null;
  branchId:            string | null;
  isActive:            boolean;
  lastSyncAt:          string | null;
  branch:              Pick<Branch, "id" | "code" | "name"> | null;
}

// ── Shift (master data) ───────────────────────────────────────────────────────
export interface ShiftMaster {
  id:        string;
  code:      string;
  name:      string;
  startTime: string | null;
  endTime:   string | null;
  color:     string | null;
  isWorking: boolean;
  isActive:  boolean;
  isUsed:    boolean;
}
export interface CreateShiftInput {
  code:       string;
  name:       string;
  startTime?: string;
  endTime?:   string;
  color?:     string;
  isWorking?: boolean;
}
export type UpdateShiftInput = Partial<CreateShiftInput> & { isActive?: boolean };

// ── Salary Settings ───────────────────────────────────────────────────
export interface SalarySetting {
  id:                              string;
  employeeId:                      string;
  baseSalary:                      number;
  mealAllowancePerDay:             number;
  tunjangan:                       number;
  transportAllowance:              number;
  overtimeRatePerHour:             number;
  holidayRatePerDay:               number;
  lateDeductionPerMinute:          number;
  lateDeductionBracket1:           number;
  lateDeductionBracket2:           number;
  lateDeductionBracket3:           number;
  absentDeductionPerDay:           number;
  earlyLeaveDeductionPerMinute:    number;
  bpjsJhtPercent:                  number;
  bpjsJhtEmployerPercent:          number;
  bpjsJpPercent:                   number;
  bpjsJpEmployerPercent:           number;
  bpjsKesehatanEmployeePercent:    number;
  bpjsKesehatanEmployerPercent:    number;
  effectiveDate:                   string;
  endDate:                         string | null;
  isActive:                        boolean;
  notes:                           string | null;
  createdAt:                       string;
  updatedAt:                       string;
}

export interface CreateSalaryInput {
  employeeId:                      string;
  baseSalary:                      number;
  mealAllowancePerDay?:            number;
  tunjangan?:                      number;
  transportAllowance?:             number;
  overtimeRatePerHour?:            number;
  holidayRatePerDay?:              number;
  lateDeductionPerMinute?:         number;
  lateDeductionBracket1?:          number;
  lateDeductionBracket2?:          number;
  lateDeductionBracket3?:          number;
  absentDeductionPerDay?:          number;
  earlyLeaveDeductionPerMinute?:   number;
  bpjsJhtPercent?:                 number;
  bpjsJhtEmployerPercent?:         number;
  bpjsJpPercent?:                  number;
  bpjsJpEmployerPercent?:          number;
  bpjsKesehatanEmployeePercent?:   number;
  bpjsKesehatanEmployerPercent?:   number;
  effectiveDate:                   string;
  endDate?:                        string;
  isActive?:                       boolean;
  notes?:                          string;
}
export type UpdateSalaryInput = Partial<Omit<CreateSalaryInput, "employeeId">>;

// ── Holiday ────────────────────────────────────────────────────────────
export interface Holiday {
  id:        string;
  date:      string;
  name:      string;
  year:      number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayInput {
  date: string;
  name: string;
}

export interface UpdateHolidayInput {
  date?: string;
  name?: string;
}

// ── Loan (Kasbon) ─────────────────────────────────────────────────────
export type LoanStatus = "ACTIVE" | "PAID_OFF" | "CANCELLED";

export interface LoanRepayment {
  id:        string;
  loanId:    string;
  payrollId: string | null;
  amount:    number;
  paidAt:    string;
  notes:     string | null;
  createdAt: string;
}

export interface Loan {
  id:               string;
  employeeId:       string;
  branchId:         string;
  loanNo:           string;
  totalAmount:      number;
  remainingAmount:  number;
  monthlyDeduction: number;
  startDate:        string;
  endDate:          string | null;
  status:           LoanStatus;
  notes:            string | null;
  createdAt:        string;
  updatedAt:        string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { id: string; code: string; name: string };
  };
  branch: { id: string; code: string; name: string };
  repayments: LoanRepayment[];
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
  amount:    number;
  paidAt:    string;
  notes?:    string;
  payrollId?: string;
}

export interface LoanListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  branchId?:   string;
  status?:     LoanStatus;
}

// ── List params ───────────────────────────────────────────────────────
export interface EmployeeListParams   { page?: number; limit?: number; search?: string; isActive?: boolean; branchId?: string }
export interface EmployeeRoleListParams { page?: number; limit?: number; search?: string }
export interface UserListParams       { page?: number; limit?: number; search?: string }
export interface BranchListParams     { page?: number; limit?: number }
export interface PaymentMethodListParams { page?: number; limit?: number }
export interface CashAccountListParams   { page?: number; limit?: number }
export interface WarehouseListParams     { page?: number; limit?: number; branchId?: string; isActive?: boolean }

// ── Create / Update inputs ────────────────────────────────────────────
export interface CreateEmployeeInput {
  name:          string;
  roleId:        string;
  employeeCode?: string;
  phone?:        string;
  email?:        string;
  homeBranchId?: string | null;
}
export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & { isActive?: boolean };
export interface UpdateEmployeeBranchesInput { branchIds: string[] }

export interface CreateEmployeeRoleInput { code: string; name: string }
export type UpdateEmployeeRoleInput = Partial<CreateEmployeeRoleInput> & { isActive?: boolean };

export interface CreateUserInput { username: string; employeeId: string; email: string; password: string; userRoleId: string }
export interface UpdateUserInput { username?: string; email?: string; userRoleId?: string }
export interface ResetPasswordInput { password: string }

export interface CreateBranchInput { code: string; name: string; address?: string; city?: string; province?: string; phone?: string; latitude?: number | null; longitude?: number | null; radiusMeters?: number }
export type UpdateBranchInput = Partial<CreateBranchInput> & { isActive?: boolean };

export interface CreatePaymentMethodInput { code: string; name: string; cashAccountId?: string }
export type UpdatePaymentMethodInput = Partial<CreatePaymentMethodInput> & { isActive?: boolean };

export interface CreateCashAccountInput { code: string; name: string; accurateAccountId?: number; accurateAccountNo?: string }
export type UpdateCashAccountInput = Partial<CreateCashAccountInput> & { isActive?: boolean };

export interface UpdateWarehouseBranchInput   { branchId: string }
export interface UpdateWarehouseAccurateInput { accurateWarehouseId: number }

// ── Leave Type ─────────────────────────────────────────────────────────
export type QuotaType = "ANNUAL" | "EVENT_BASED" | "LIFETIME";

export interface LeaveType {
  id:                  string;
  code:                string;
  name:                string;
  quotaType:           QuotaType;
  maxDaysPerYear:      number;
  isPaid:              boolean;
  unusedDayPayoutRate: number;
  isActive:            boolean;
}
export interface CreateLeaveTypeInput {
  code:                string;
  name:                string;
  quotaType?:          QuotaType;
  maxDaysPerYear?:     number;
  isPaid?:             boolean;
  unusedDayPayoutRate?: number;
}
export type UpdateLeaveTypeInput = Partial<Omit<CreateLeaveTypeInput, "code">> & { isActive?: boolean };

// ── Leave Quota ────────────────────────────────────────────────────────
export interface LeaveQuota {
  id:          string;
  employeeId:  string;
  leaveTypeId: string;
  year:        number;
  totalDays:   number;
  usedDays:    number;
  employee:    { id: string; name: string; employeeCode: string | null };
  leaveType:   { id: string; code: string; name: string; quotaType: QuotaType; maxDaysPerYear: number; isPaid: boolean };
}
export interface AssignQuotaInput {
  employeeId:  string;
  leaveTypeId: string;
  year:        number;
  totalDays:   number;
}
export interface LeaveQuotaParams {
  employeeId?: string;
  year?:       number;
}

// ── Membership ─────────────────────────────────────────────────────────
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface Membership {
  id:           string;
  name:         string;
  price:        string;
  durationDays: number;
  discountType:  DiscountType;
  discountValue: string;
  createdAt:    string;
  updatedAt:    string;
}

export interface CreateMembershipInput {
  name:         string;
  price:        number;
  durationDays: number;
  discountType:  DiscountType;
  discountValue: number;
}

export type UpdateMembershipInput = Partial<CreateMembershipInput>;

export interface MembershipListParams {
  page?:  number;
  limit?: number;
}

export interface CustomerMembershipRecord {
  id:          string;
  customerId:  string;
  membershipId: string;
  startDate:   string;
  endDate:     string;
  status:      "ACTIVE" | "EXPIRED" | "CANCELLED";
  membership:  Membership;
}
