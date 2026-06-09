import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/common/Pagination";

import {
  useEmployees, useCreateEmployee, useUpdateEmployee, useUpdateEmployeeBranches,
  useEmployeeRoles, useCreateEmployeeRole, useUpdateEmployeeRole,
  useUsers, useCreateUser, useUpdateUser, useResetUserPassword,
  useBranches, useCreateBranch, useUpdateBranch,
  usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useCashAccounts, useUpdateCashAccount, useDeleteCashAccount, useSyncCashAccounts,
  useWarehouses, useSyncWarehouses, useUpdateWarehouseBranch, useUpdateWarehouseAccurate,
} from "../hooks";

import { EmployeeTable }     from "../components/employee/EmployeeTable";
import { EmployeeForm }      from "../components/employee/EmployeeForm";
import { EmployeeRoleTable } from "../components/employeeRole/EmployeeRoleTable";
import { EmployeeRoleForm }  from "../components/employeeRole/EmployeeRoleForm";
import { UserTable }         from "../components/user/UserTable";
import { UserForm, ResetPasswordDialog } from "../components/user/UserForm";
import { BranchTable }       from "../components/branch/BranchTable";
import { BranchForm }        from "../components/branch/BranchForm";
import { PaymentMethodTable } from "../components/paymentMethod/PaymentMethodTable";
import { PaymentMethodForm }  from "../components/paymentMethod/PaymentMethodForm";
import { CashAccountTable }   from "../components/cashAccount/CashAccountTable";
import { CashAccountForm }    from "../components/cashAccount/CashAccountForm";
import { WarehouseTable }     from "../components/warehouse/WarehouseTable";
import { WarehouseForm }      from "../components/warehouse/WarehouseForm";
import type { WarehouseFormValues } from "../components/warehouse/WarehouseForm";
import { AccuratePanel }      from "../accurate/AccuratePanel";

import type { Employee, EmployeeRole, User, Branch, PaymentMethod, CashAccount, Warehouse } from "../types";
import type { EmployeeFormValues } from "../schemas/employee.schema";
import type { EmployeeRoleFormValues } from "../schemas/employeeRole.schema";
import type { CreateUserFormValues, UpdateUserFormValues, ResetPasswordFormValues } from "../schemas/user.schema";
import type { BranchFormValues } from "../schemas/branch.schema";
import type { PaymentMethodFormValues } from "../schemas/paymentMethod.schema";
import type { CashAccountFormValues } from "../schemas/cashAccount.schema";

// ────────────────────────────────────────────────────────────────────────────
// Tab 1 — Employee Management
// ────────────────────────────────────────────────────────────────────────────
function EmployeeTab() {
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [empPage, setEmpPage]       = useState(1);
  const [empFormOpen, setEmpForm]   = useState(false);
  const [editEmp, setEditEmp]       = useState<Employee | null>(null);
  const [empError, setEmpError]     = useState<string | null>(null);

  const [roleFormOpen, setRoleForm]   = useState(false);
  const [editRole, setEditRole]       = useState<EmployeeRole | null>(null);
  const [roleError, setRoleError]     = useState<string | null>(null);

  const { data: empData, isLoading: empLoading } = useEmployees({
    page: empPage, limit: 20, search: debouncedSearch || undefined,
  });
  const { data: empCountData } = useEmployees({ limit: 1 });
  const { data: roleData, isLoading: roleLoading } = useEmployeeRoles({ limit: 100 });

  const employees = empData?.data ?? [];
  const roles     = roleData?.data ?? [];
  const empMeta   = empData?.meta;

  const nextEmployeeCode = `EMP${String((empCountData?.meta?.total ?? 0) + 1).padStart(3, "0")}`;

  const createEmpMut    = useCreateEmployee();
  const updateEmpMut    = useUpdateEmployee(editEmp?.id ?? "");
  const updateBranchMut = useUpdateEmployeeBranches(editEmp?.id ?? "");
  const createRoleMut   = useCreateEmployeeRole();
  const updateRoleMut   = useUpdateEmployeeRole(editRole?.id ?? "");

  const empPending  = createEmpMut.isPending || updateEmpMut.isPending || updateBranchMut.isPending;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setEmpPage(1);
    clearTimeout((window as unknown as { _empSearchTimer?: ReturnType<typeof setTimeout> })._empSearchTimer);
    (window as unknown as { _empSearchTimer?: ReturnType<typeof setTimeout> })._empSearchTimer =
      setTimeout(() => setDebounced(e.target.value), 400);
  }

  function openCreateEmp() {
    setEditEmp(null);
    setEmpError(null);
    setEmpForm(true);
  }

  function openEditEmp(emp: Employee) {
    setEditEmp(emp);
    setEmpError(null);
    setEmpForm(true);
  }

  async function handleEmpSubmit(values: EmployeeFormValues) {
    setEmpError(null);
    try {
      const branchIds = values.branchIds ?? [];
      if (editEmp) {
        await updateEmpMut.mutateAsync({
          name:         values.name,
          roleId:       values.roleId || undefined,
          employeeCode: values.employeeCode || undefined,
          phone:        values.phone || undefined,
          email:        values.email || undefined,
        });
        await updateBranchMut.mutateAsync({ branchIds });
      } else {
        const created = await createEmpMut.mutateAsync({
          name:         values.name,
          roleId:       values.roleId,
          employeeCode: values.employeeCode || undefined,
          phone:        values.phone || undefined,
          email:        values.email || undefined,
        });
        if (branchIds.length > 0) {
          const { updateEmployeeBranches } = await import("../api/employee.api");
          await updateEmployeeBranches(created.id, { branchIds });
        }
      }
      setEmpForm(false);
    } catch (err: unknown) {
      setEmpError(err instanceof Error ? err.message : "Failed to save employee");
    }
  }

  function openCreateRole() {
    setEditRole(null);
    setRoleError(null);
    setRoleForm(true);
  }

  function openEditRole(role: EmployeeRole) {
    setEditRole(role);
    setRoleError(null);
    setRoleForm(true);
  }

  async function handleRoleSubmit(values: EmployeeRoleFormValues) {
    setRoleError(null);
    try {
      if (editRole) {
        await updateRoleMut.mutateAsync(values);
      } else {
        await createRoleMut.mutateAsync(values);
      }
      setRoleForm(false);
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : "Failed to save role");
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Employees</h2>
            <p className="text-sm text-muted-foreground">{empMeta ? `${empMeta.total} total` : ""}</p>
          </div>
          <Button size="sm" onClick={openCreateEmp}>
            <Plus className="mr-2 h-4 w-4" />New Employee
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, phone…"
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <EmployeeTable employees={employees} isLoading={empLoading} onEdit={openEditEmp} />
          </CardContent>
        </Card>

        {empMeta && (
          <Pagination
            page={empMeta.page}
            limit={empMeta.limit}
            total={empMeta.total}
            totalPages={empMeta.totalPages}
            onPageChange={setEmpPage}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Employee Role section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Manage Employee Roles</h2>
            <p className="text-sm text-muted-foreground">Job titles used for HR and scheduling</p>
          </div>
          <Button size="sm" variant="outline" onClick={openCreateRole}>
            <Plus className="mr-2 h-4 w-4" />New Role
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <EmployeeRoleTable roles={roles} isLoading={roleLoading} onEdit={openEditRole} />
          </CardContent>
        </Card>
      </div>

      {/* Forms */}
      <EmployeeForm
        open={empFormOpen}
        onOpenChange={setEmpForm}
        onSubmit={handleEmpSubmit}
        isPending={empPending}
        defaultValues={editEmp}
        error={empError}
        nextCode={editEmp ? undefined : nextEmployeeCode}
      />
      <EmployeeRoleForm
        open={roleFormOpen}
        onOpenChange={setRoleForm}
        onSubmit={handleRoleSubmit}
        isPending={createRoleMut.isPending || updateRoleMut.isPending}
        defaultValues={editRole}
        error={roleError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 2 — User Account
// ────────────────────────────────────────────────────────────────────────────
function UserTab() {
  const [formOpen, setFormOpen]         = useState(false);
  const [editUser, setEditUser]         = useState<User | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);
  const [pwOpen, setPwOpen]             = useState(false);
  const [pwUser, setPwUser]             = useState<User | null>(null);
  const [pwError, setPwError]           = useState<string | null>(null);
  const [userSearch, setUserSearch]     = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [userPage, setUserPage]         = useState(1);

  const { data, isLoading } = useUsers({
    page: userPage, limit: 20, search: debouncedUser || undefined,
  });
  const users    = data?.data ?? [];
  const userMeta = data?.meta;

  function handleUserSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setUserSearch(e.target.value);
    setUserPage(1);
    clearTimeout((window as unknown as { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer);
    (window as unknown as { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer =
      setTimeout(() => setDebouncedUser(e.target.value), 400);
  }

  const createMut = useCreateUser();
  const updateMut = useUpdateUser(editUser?.id ?? "");
  const resetPwMut = useResetUserPassword(pwUser?.id ?? "");

  function openCreate() { setEditUser(null); setFormError(null); setFormOpen(true); }
  function openEdit(user: User) { setEditUser(user); setFormError(null); setFormOpen(true); }
  function openResetPw(user: User) { setPwUser(user); setPwError(null); setPwOpen(true); }

  async function handleSubmit(values: CreateUserFormValues | UpdateUserFormValues) {
    setFormError(null);
    try {
      if (editUser) {
        const v = values as UpdateUserFormValues;
        await updateMut.mutateAsync({ email: v.email || undefined, userRoleId: v.userRoleId });
      } else {
        const v = values as CreateUserFormValues;
        await createMut.mutateAsync(v);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save user");
    }
  }

  async function handleResetPw(values: ResetPasswordFormValues) {
    setPwError(null);
    try {
      await resetPwMut.mutateAsync(values);
      setPwOpen(false);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            {userMeta ? `${userMeta.total} total` : "System login accounts and permissions"}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />New User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email, employee…"
              value={userSearch}
              onChange={handleUserSearch}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable users={users} isLoading={isLoading} onEdit={openEdit} onResetPw={openResetPw} />
        </CardContent>
      </Card>

      {userMeta && (
        <Pagination
          page={userMeta.page}
          limit={userMeta.limit}
          total={userMeta.total}
          totalPages={userMeta.totalPages}
          onPageChange={setUserPage}
        />
      )}

      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending}
        defaultValues={editUser}
        error={formError}
      />
      <ResetPasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        onSubmit={handleResetPw}
        isPending={resetPwMut.isPending}
        error={pwError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 3 — Branch
// ────────────────────────────────────────────────────────────────────────────
function BranchTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editBranch, setEdit]     = useState<Branch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useBranches({ limit: 100 });
  const branches = data?.data ?? [];

  const createMut = useCreateBranch();
  const updateMut = useUpdateBranch(editBranch?.id ?? "");

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  function openEdit(b: Branch) { setEdit(b); setFormError(null); setFormOpen(true); }

  async function handleSubmit(values: BranchFormValues) {
    setFormError(null);
    try {
      if (editBranch) {
        await updateMut.mutateAsync({
          code:     values.code,
          name:     values.name,
          address:  values.address || undefined,
          city:     values.city || undefined,
          province: values.province || undefined,
          phone:    values.phone || undefined,
        });
      } else {
        await createMut.mutateAsync({
          code:     values.code,
          name:     values.name,
          address:  values.address || undefined,
          city:     values.city || undefined,
          province: values.province || undefined,
          phone:    values.phone || undefined,
        });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save branch");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">Salon locations</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />New Branch
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <BranchTable branches={branches} isLoading={isLoading} onEdit={openEdit} />
        </CardContent>
      </Card>

      <BranchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending}
        defaultValues={editBranch}
        error={formError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 4 — Payment Method
// ────────────────────────────────────────────────────────────────────────────
function PaymentMethodTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editMethod, setEdit]     = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = usePaymentMethods({ limit: 100 });
  const methods = data?.data ?? [];

  const createMut = useCreatePaymentMethod();
  const updateMut = useUpdatePaymentMethod(editMethod?.id ?? "");
  const deleteMut = useDeletePaymentMethod();

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  function openEdit(m: PaymentMethod) { setEdit(m); setFormError(null); setFormOpen(true); }
  async function handleDelete(m: PaymentMethod) {
    if (!confirm(`Delete "${m.name}"?`)) return;
    try { await deleteMut.mutateAsync(m.id); }
    catch { /* handled by query invalidation */ }
  }

  async function handleSubmit(values: PaymentMethodFormValues) {
    setFormError(null);
    try {
      const payload = {
        code:          values.code,
        name:          values.name,
        cashAccountId: values.cashAccountId || undefined,
      };
      if (editMethod) {
        await updateMut.mutateAsync(payload);
      } else {
        await createMut.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save payment method");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Payment Methods</h2>
          <p className="text-sm text-muted-foreground">Configure accepted payment types</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />New Method
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <PaymentMethodTable
            methods={methods}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <PaymentMethodForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending}
        defaultValues={editMethod}
        error={formError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 5 — Cash Account
// ────────────────────────────────────────────────────────────────────────────
function CashAccountTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editAccount, setEdit]    = useState<CashAccount | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useCashAccounts({ limit: 100 });
  const accounts = data?.data ?? [];

  const syncMut   = useSyncCashAccounts();
  const updateMut = useUpdateCashAccount(editAccount?.id ?? "");
  const deleteMut = useDeleteCashAccount();

  function openEdit(a: CashAccount) { setEdit(a); setFormError(null); setFormOpen(true); }

  async function handleSync() {
    try {
      const result = await syncMut.mutateAsync();
      alert(`Sync complete: ${result.synced} synced, ${result.skipped} skipped.`);
    } catch {
      alert("Sync failed. Please try again.");
    }
  }

  async function handleDelete(a: CashAccount) {
    if (!confirm(`Deactivate "${a.name}"?`)) return;
    try { await deleteMut.mutateAsync(a.id); }
    catch { /* handled by query invalidation */ }
  }

  async function handleSubmit(values: CashAccountFormValues) {
    setFormError(null);
    try {
      await updateMut.mutateAsync({
        name:              values.name,
        accurateAccountId: values.accurateAccountId ? Number(values.accurateAccountId) : undefined,
        accurateAccountNo: values.accurateAccountNo || undefined,
      });
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save cash account");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Cash Accounts</h2>
          <p className="text-sm text-muted-foreground">Synced from Accurate Online (GL accounts, type: Cash/Bank)</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncMut.isPending}>
          {syncMut.isPending ? "Syncing…" : "Sync from Accurate"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <CashAccountTable
            accounts={accounts}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <CashAccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={updateMut.isPending}
        defaultValues={editAccount}
        error={formError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 6 — Warehouse
// ────────────────────────────────────────────────────────────────────────────
function WarehouseTab() {
  const [formOpen, setFormOpen]       = useState(false);
  const [editWh, setEditWh]           = useState<Warehouse | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [warehousePage, setWhPage]    = useState(1);

  const { data, isLoading }  = useWarehouses({ page: warehousePage, limit: 20 });
  const warehouses            = data?.data ?? [];
  const whMeta                = data?.meta;

  const syncMut               = useSyncWarehouses();
  const updateBranchMut       = useUpdateWarehouseBranch(editWh?.id ?? "");
  const updateAccurateMut     = useUpdateWarehouseAccurate(editWh?.id ?? "");

  const isPending = updateBranchMut.isPending || updateAccurateMut.isPending;

  function openEdit(wh: Warehouse) {
    setEditWh(wh);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSync() {
    try {
      const result = await syncMut.mutateAsync();
      alert(`Sync complete: ${result.created} created, ${result.updated} updated.`);
    } catch {
      alert("Sync failed. Please try again.");
    }
  }

  async function handleSubmit(values: WarehouseFormValues, original: Warehouse) {
    setFormError(null);
    try {
      const branchChanged   = values.branchId && values.branchId !== original.branchId;
      const accurateChanged = values.accurateWarehouseId &&
        Number(values.accurateWarehouseId) !== original.accurateWarehouseId;

      if (branchChanged) {
        await updateBranchMut.mutateAsync({ branchId: values.branchId! });
      }
      if (accurateChanged) {
        await updateAccurateMut.mutateAsync({ accurateWarehouseId: Number(values.accurateWarehouseId) });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update warehouse");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Warehouses</h2>
          <p className="text-sm text-muted-foreground">
            {whMeta ? `${whMeta.total} total` : "Synced from Accurate Online"}
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={handleSync}
          disabled={syncMut.isPending}
        >
          {syncMut.isPending ? "Syncing…" : "Sync from Accurate"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <WarehouseTable warehouses={warehouses} isLoading={isLoading} onEdit={openEdit} />
        </CardContent>
      </Card>

      {whMeta && (
        <Pagination
          page={whMeta.page}
          limit={whMeta.limit}
          total={whMeta.total}
          totalPages={whMeta.totalPages}
          onPageChange={setWhPage}
        />
      )}

      <WarehouseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={isPending}
        warehouse={editWh}
        error={formError}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main SettingsPage
// ────────────────────────────────────────────────────────────────────────────
const TABS = [
  { value: "employees",       label: "Employee Management" },
  { value: "users",           label: "User Account" },
  { value: "branches",        label: "Branch" },
  { value: "payment-methods", label: "Payment Method" },
  { value: "cash-accounts",   label: "Cash Account" },
  { value: "warehouses",      label: "Warehouse" },
  { value: "accurate",        label: "Accurate" },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<string>("employees");

  return (
    <PageContainer>
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage employees, users, branches, and configuration</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        {/* ── Mobile: native select ─────────────────────────────────── */}
        <div className="md:hidden">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TABS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* ── Desktop: underline tab bar ────────────────────────────── */}
        <TabsList className="hidden md:flex h-auto w-full items-end justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="employees"       className="mt-6"><EmployeeTab /></TabsContent>
        <TabsContent value="users"           className="mt-6"><UserTab /></TabsContent>
        <TabsContent value="branches"        className="mt-6"><BranchTab /></TabsContent>
        <TabsContent value="payment-methods" className="mt-6"><PaymentMethodTab /></TabsContent>
        <TabsContent value="cash-accounts"   className="mt-6"><CashAccountTab /></TabsContent>
        <TabsContent value="warehouses"      className="mt-6"><WarehouseTab /></TabsContent>
        <TabsContent value="accurate"        className="mt-6"><AccuratePanel /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}
