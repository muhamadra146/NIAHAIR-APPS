import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShifts, createShift, updateShift, deleteShift } from "@/features/schedule/api/shift.api";
import {
  fetchEmployees, fetchEmployee, createEmployee, updateEmployee, updateEmployeeBranches, deleteEmployee,
} from "../api/employee.api";
import { fetchEmployeeRoles, createEmployeeRole, updateEmployeeRole, deleteEmployeeRole } from "../api/employeeRole.api";
import { fetchUsers, createUser, updateUser, resetUserPassword, deactivateUser } from "../api/user.api";
import { fetchUserRoles } from "../api/userRole.api";
import { fetchBranches, fetchAllBranches, createBranch, updateBranch, deleteBranch } from "../api/branch.api";
import {
  fetchPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod,
} from "../api/paymentMethod.api";
import {
  fetchCashAccounts, fetchAllCashAccounts, createCashAccount, updateCashAccount, deleteCashAccount,
  syncCashAccounts,
} from "../api/cashAccount.api";
import {
  fetchWarehouses, syncWarehouses, updateWarehouseBranch, updateWarehouseAccurate,
} from "../api/warehouse.api";
import { fetchSalarySettings, createSalarySetting, updateSalarySetting } from "../api/salary.api";
import { fetchLoansByEmployee, fetchLoans, createLoan, updateLoan, cancelLoan, addRepayment } from "../api/loan.api";
import { fetchLeaveTypes, createLeaveType, updateLeaveType } from "../api/leaveType.api";
import { fetchLeaveQuotas, fetchMyLeaveQuotas, assignLeaveQuota } from "../api/leaveQuota.api";
import {
  fetchMemberships, fetchAllMemberships, createMembership, updateMembership, deleteMembership,
  fetchCustomerMembership, assignMembership, cancelCustomerMembership,
} from "../api/membership.api";
import type {
  EmployeeListParams, EmployeeRoleListParams, UserListParams, BranchListParams,
  PaymentMethodListParams, CashAccountListParams, WarehouseListParams,
  CreateEmployeeInput, UpdateEmployeeInput, UpdateEmployeeBranchesInput,
  CreateEmployeeRoleInput, UpdateEmployeeRoleInput,
  CreateUserInput, UpdateUserInput, ResetPasswordInput,
  CreateBranchInput, UpdateBranchInput,
  CreatePaymentMethodInput, UpdatePaymentMethodInput,
  CreateCashAccountInput, UpdateCashAccountInput,
  UpdateWarehouseBranchInput, UpdateWarehouseAccurateInput,
  CreateShiftInput, UpdateShiftInput,
  CreateSalaryInput, UpdateSalaryInput,
  LoanListParams, CreateLoanInput, UpdateLoanInput, AddRepaymentInput,
  CreateLeaveTypeInput, UpdateLeaveTypeInput,
  AssignQuotaInput, LeaveQuotaParams,
  CreateMembershipInput, UpdateMembershipInput, MembershipListParams,
} from "../types";

// ── Employees ─────────────────────────────────────────────────────────
export const useEmployees = (params: EmployeeListParams = {}) =>
  useQuery({ queryKey: ["employees", params], queryFn: () => fetchEmployees(params) });

export const useEmployee = (id: string) =>
  useQuery({ queryKey: ["employees", id], queryFn: () => fetchEmployee(id), enabled: Boolean(id) });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
  });
};

export const useUpdateEmployee = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) => updateEmployee(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.setQueryData(["employees", id], data);
    },
  });
};

export const useUpdateEmployeeBranches = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeBranchesInput) => updateEmployeeBranches(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.setQueryData(["employees", id], data);
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
  });
};

// ── Employee Roles ────────────────────────────────────────────────────
export const useEmployeeRoles = (params: EmployeeRoleListParams = {}) =>
  useQuery({ queryKey: ["employeeRoles", params], queryFn: () => fetchEmployeeRoles(params) });

export const useAllEmployeeRoles = () =>
  useQuery({ queryKey: ["employeeRoles", "all"], queryFn: () => fetchEmployeeRoles({ limit: 100 }) });

export const useCreateEmployeeRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeRoleInput) => createEmployeeRole(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employeeRoles"] }); },
  });
};

export const useUpdateEmployeeRole = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeRoleInput) => updateEmployeeRole(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employeeRoles"] }); },
  });
};

export const useDeleteEmployeeRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployeeRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employeeRoles"] }); },
  });
};

// ── Users ─────────────────────────────────────────────────────────────
export const useUsers = (params: UserListParams = {}) =>
  useQuery({ queryKey: ["users", params], queryFn: () => fetchUsers(params) });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); },
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); },
  });
};

export const useResetUserPassword = (id: string) =>
  useMutation({ mutationFn: (input: ResetPasswordInput) => resetUserPassword(id, input) });

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); },
  });
};

// ── User Roles ────────────────────────────────────────────────────────
export const useUserRoles = () =>
  useQuery({ queryKey: ["userRoles"], queryFn: fetchUserRoles });

// ── Branches ──────────────────────────────────────────────────────────
export const useBranches = (params: BranchListParams = {}) =>
  useQuery({ queryKey: ["branches", params], queryFn: () => fetchBranches(params) });

export const useAllBranches = () =>
  useQuery({ queryKey: ["branches", "all"], queryFn: fetchAllBranches });

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => createBranch(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); },
  });
};

export const useUpdateBranch = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBranchInput) => updateBranch(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); },
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); },
  });
};

// ── Payment Methods ───────────────────────────────────────────────────
export const usePaymentMethods = (params: PaymentMethodListParams = {}) =>
  useQuery({ queryKey: ["paymentMethods", params], queryFn: () => fetchPaymentMethods(params) });

export const useCreatePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentMethodInput) => createPaymentMethod(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paymentMethods"] }); },
  });
};

export const useUpdatePaymentMethod = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePaymentMethodInput) => updatePaymentMethod(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paymentMethods"] }); },
  });
};

export const useDeletePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paymentMethods"] }); },
  });
};

// ── Cash Accounts ─────────────────────────────────────────────────────
export const useCashAccounts = (params: CashAccountListParams = {}) =>
  useQuery({ queryKey: ["cashAccounts", params], queryFn: () => fetchCashAccounts(params) });

export const useAllCashAccounts = () =>
  useQuery({ queryKey: ["cashAccounts", "all"], queryFn: fetchAllCashAccounts });

export const useCreateCashAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCashAccountInput) => createCashAccount(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashAccounts"] }); },
  });
};

export const useUpdateCashAccount = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCashAccountInput) => updateCashAccount(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashAccounts"] }); },
  });
};

export const useDeleteCashAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCashAccount(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashAccounts"] }); },
  });
};

export const useSyncCashAccounts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncCashAccounts,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cashAccounts"] }); },
  });
};

// ── Warehouses ────────────────────────────────────────────────────────
export const useWarehouses = (params: WarehouseListParams = {}) =>
  useQuery({ queryKey: ["warehouses", params], queryFn: () => fetchWarehouses(params) });

export const useSyncWarehouses = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncWarehouses,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); },
  });
};

export const useUpdateWarehouseBranch = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWarehouseBranchInput) => updateWarehouseBranch(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); },
  });
};

export const useUpdateWarehouseAccurate = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWarehouseAccurateInput) => updateWarehouseAccurate(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warehouses"] }); },
  });
};

// ── Shifts ────────────────────────────────────────────────────────────────────
export const useShiftMasters = () =>
  useQuery({ queryKey: ["shifts"], queryFn: fetchShifts, staleTime: 5 * 60 * 1000 });

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShiftInput) => createShift(input),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["shifts"] }); },
  });
};

export const useUpdateShift = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShiftInput) => updateShift(id, input),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["shifts"] }); },
  });
};

export const useDeleteShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["shifts"] }); },
  });
};

// ── Salary Settings ───────────────────────────────────────────────────────────
export const useSalarySettings = (employeeId: string) =>
  useQuery({
    queryKey: ["salarySettings", employeeId],
    queryFn:  () => fetchSalarySettings(employeeId),
    enabled:  Boolean(employeeId),
  });

export const useCreateSalarySetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalaryInput) => createSalarySetting(input),
    onSuccess:  (_, vars) => { qc.invalidateQueries({ queryKey: ["salarySettings", vars.employeeId] }); },
  });
};

export const useUpdateSalarySetting = (id: string, employeeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSalaryInput) => updateSalarySetting(id, input),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["salarySettings", employeeId] }); },
  });
};

// ── Loans (Kasbon) ────────────────────────────────────────────────────────────
export const useLoans = (params: LoanListParams = {}) =>
  useQuery({ queryKey: ["loans", params], queryFn: () => fetchLoans(params) });

export const useLoansByEmployee = (employeeId: string) =>
  useQuery({
    queryKey: ["loans", "employee", employeeId],
    queryFn:  () => fetchLoansByEmployee(employeeId),
    enabled:  Boolean(employeeId),
  });

export const useCreateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLoanInput) => createLoan(input),
    onSuccess:  (_, vars) => {
      qc.invalidateQueries({ queryKey: ["loans", "employee", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
};

export const useUpdateLoan = (id: string, employeeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLoanInput) => updateLoan(id, input),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["loans", "employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
};

export const useCancelLoan = (employeeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelLoan(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["loans", "employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
};

export const useAddRepayment = (loanId: string, employeeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRepaymentInput) => addRepayment(loanId, input),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["loans", "employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
};

// ── Leave Types ───────────────────────────────────────────────────────
export const useLeaveTypes = (includeInactive = false) =>
  useQuery({ queryKey: ["leaveTypes", includeInactive], queryFn: () => fetchLeaveTypes(includeInactive) });

export const useCreateLeaveType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveTypeInput) => createLeaveType(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaveTypes"] }); },
  });
};

export const useUpdateLeaveType = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLeaveTypeInput) => updateLeaveType(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaveTypes"] }); },
  });
};

// ── Leave Quotas ──────────────────────────────────────────────────────
export const useLeaveQuotas = (params: LeaveQuotaParams = {}) =>
  useQuery({ queryKey: ["leaveQuotas", params], queryFn: () => fetchLeaveQuotas(params) });

export const useMyLeaveQuotas = (year?: number) =>
  useQuery({ queryKey: ["leaveQuotas", "my", year], queryFn: () => fetchMyLeaveQuotas(year) });

export const useAssignLeaveQuota = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignQuotaInput) => assignLeaveQuota(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leaveQuotas"] }); },
  });
};

// ── Memberships ───────────────────────────────────────────────────────
export const useMemberships = (params: MembershipListParams = {}) =>
  useQuery({ queryKey: ["memberships", params], queryFn: () => fetchMemberships(params) });

export const useAllMemberships = () =>
  useQuery({ queryKey: ["memberships", "all"], queryFn: fetchAllMemberships });

export const useCreateMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMembershipInput) => createMembership(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberships"] }); },
  });
};

export const useUpdateMembership = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMembershipInput) => updateMembership(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberships"] }); },
  });
};

export const useDeleteMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMembership(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberships"] }); },
  });
};

export const useCustomerMembership = (customerId: string) =>
  useQuery({
    queryKey: ["memberships", "customer", customerId],
    queryFn:  () => fetchCustomerMembership(customerId),
    enabled:  Boolean(customerId),
  });

export const useAssignMembership = (customerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => assignMembership(customerId, membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships", "customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useCancelCustomerMembership = (customerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelCustomerMembership(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships", "customer", customerId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
