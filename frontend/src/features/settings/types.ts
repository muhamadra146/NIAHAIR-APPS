// ── Branch ────────────────────────────────────────────────────────────
export interface Branch {
  id:       string;
  code:     string;
  name:     string;
  address:  string | null;
  city:     string | null;
  province: string | null;
  phone:    string | null;
  isActive: boolean;
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
  isActive:         boolean;
  createdAt:        string;
  updatedAt:        string;
  role:             Pick<EmployeeRole, "id" | "code" | "name">;
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

// ── List params ───────────────────────────────────────────────────────
export interface EmployeeListParams   { page?: number; limit?: number; search?: string; isActive?: boolean }
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
}
export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & { isActive?: boolean };
export interface UpdateEmployeeBranchesInput { branchIds: string[] }

export interface CreateEmployeeRoleInput { code: string; name: string }
export type UpdateEmployeeRoleInput = Partial<CreateEmployeeRoleInput> & { isActive?: boolean };

export interface CreateUserInput { employeeId: string; email: string; password: string; userRoleId: string }
export interface UpdateUserInput { email?: string; userRoleId?: string }
export interface ResetPasswordInput { password: string }

export interface CreateBranchInput { code: string; name: string; address?: string; city?: string; province?: string; phone?: string }
export type UpdateBranchInput = Partial<CreateBranchInput> & { isActive?: boolean };

export interface CreatePaymentMethodInput { code: string; name: string; cashAccountId?: string }
export type UpdatePaymentMethodInput = Partial<CreatePaymentMethodInput> & { isActive?: boolean };

export interface CreateCashAccountInput { code: string; name: string; accurateAccountId?: number; accurateAccountNo?: string }
export type UpdateCashAccountInput = Partial<CreateCashAccountInput> & { isActive?: boolean };

export interface UpdateWarehouseBranchInput   { branchId: string }
export interface UpdateWarehouseAccurateInput { accurateWarehouseId: number }
