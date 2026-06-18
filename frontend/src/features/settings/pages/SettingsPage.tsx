import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/common/Pagination";

import {
  useEmployeeRoles, useCreateEmployeeRole, useUpdateEmployeeRole, useDeleteEmployeeRole,
  useUsers, useCreateUser, useUpdateUser, useResetUserPassword, useDeactivateUser,
  useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch,
  usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useCashAccounts, useUpdateCashAccount, useDeleteCashAccount, useSyncCashAccounts,
  useWarehouses, useSyncWarehouses, useUpdateWarehouseBranch, useUpdateWarehouseAccurate,
  useShiftMasters, useCreateShift, useUpdateShift, useDeleteShift,
} from "../hooks";

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
import { ShiftTable }         from "../components/shift/ShiftTable";
import { ShiftForm }          from "../components/shift/ShiftForm";
import { SalaryTab }          from "../components/salary/SalaryTab";
import { LoanTab }            from "../components/loan/LoanTab";
import { AccuratePanel }      from "../accurate/AccuratePanel";
import { CommissionSettingsTab } from "../components/commission/CommissionSettingsTab";
import { LeaveTypeTab }          from "../components/leaveType/LeaveTypeTab";
import { LeaveQuotaTab }         from "../components/leaveQuota/LeaveQuotaTab";
import { MembershipTab }         from "../components/membership/MembershipTab";

import type { EmployeeRole, User, Branch, PaymentMethod, CashAccount, Warehouse, ShiftMaster } from "../types";
import type { EmployeeRoleFormValues } from "../schemas/employeeRole.schema";
import type { CreateUserFormValues, UpdateUserFormValues, ResetPasswordFormValues } from "../schemas/user.schema";
import type { BranchFormValues } from "../schemas/branch.schema";
import type { PaymentMethodFormValues } from "../schemas/paymentMethod.schema";
import type { CashAccountFormValues } from "../schemas/cashAccount.schema";
import type { ShiftFormValues } from "../schemas/shift.schema";

// Extract the real API error message from Axios errors
function apiErr(err: unknown, fallback = "Terjadi kesalahan"): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 1 â€" Employee Management
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function EmployeeTab() {
  const [roleFormOpen, setRoleForm] = useState(false);
  const [editRole, setEditRole]     = useState<EmployeeRole | null>(null);
  const [roleError, setRoleError]   = useState<string | null>(null);

  const { data: roleData, isLoading: roleLoading } = useEmployeeRoles({ limit: 100 });
  const roles = roleData?.data ?? [];

  const createRoleMut = useCreateEmployeeRole();
  const updateRoleMut = useUpdateEmployeeRole(editRole?.id ?? "");
  const deleteRoleMut = useDeleteEmployeeRole();

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
      setRoleError(apiErr(err, "Gagal menyimpan role"));
    }
  }

  async function handleDeleteRole(role: EmployeeRole) {
    try { await deleteRoleMut.mutateAsync(role.id); } catch { /* ignored */ }
  }

  return (
    <div className="space-y-6">
      {/* Redirect card */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="font-semibold text-sm">Data Karyawan</p>
            <p className="text-sm text-muted-foreground">Tambah, edit, dan kelola karyawan di halaman Karyawan.</p>
          </div>
          <Button size="sm" asChild>
            <a href="/employees">Buka Halaman Karyawan →</a>
          </Button>
        </CardContent>
      </Card>

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
            <EmployeeRoleTable roles={roles} isLoading={roleLoading} onEdit={openEditRole} onDelete={handleDeleteRole} />
          </CardContent>
        </Card>
      </div>

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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 2 â€" User Account
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

  const createMut     = useCreateUser();
  const updateMut     = useUpdateUser(editUser?.id ?? "");
  const resetPwMut    = useResetUserPassword(pwUser?.id ?? "");
  const deactivateMut = useDeactivateUser();

  function openCreate() { setEditUser(null); setFormError(null); setFormOpen(true); }
  function openEdit(user: User) { setEditUser(user); setFormError(null); setFormOpen(true); }
  function openResetPw(user: User) { setPwUser(user); setPwError(null); setPwOpen(true); }

  async function handleDeleteUser(user: User) {
    try { await deactivateMut.mutateAsync(user.id); } catch { /* ignored */ }
  }

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
      setFormError(apiErr(err, "Gagal menyimpan user"));
    }
  }

  async function handleResetPw(values: ResetPasswordFormValues) {
    setPwError(null);
    try {
      await resetPwMut.mutateAsync(values);
      setPwOpen(false);
    } catch (err: unknown) {
      setPwError(apiErr(err, "Gagal reset password"));
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
              placeholder="Search email, employeeâ€¦"
              value={userSearch}
              onChange={handleUserSearch}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable users={users} isLoading={isLoading} onEdit={openEdit} onResetPw={openResetPw} onDelete={handleDeleteUser} />
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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 3 â€" Branch
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function BranchTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editBranch, setEdit]     = useState<Branch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useBranches({ limit: 100 });
  const branches = data?.data ?? [];

  const createMut = useCreateBranch();
  const updateMut = useUpdateBranch(editBranch?.id ?? "");
  const deleteMut = useDeleteBranch();

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  function openEdit(b: Branch) { setEdit(b); setFormError(null); setFormOpen(true); }
  async function handleDelete(b: Branch) {
    try { await deleteMut.mutateAsync(b.id); } catch { /* ignored */ }
  }

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
      setFormError(apiErr(err, "Gagal menyimpan cabang"));
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
          <BranchTable branches={branches} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 4 â€" Payment Method
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
      setFormError(apiErr(err, "Gagal menyimpan metode bayar"));
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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 5 â€" Cash Account
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
      setFormError(apiErr(err, "Gagal menyimpan akun kas"));
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
          {syncMut.isPending ? "Syncingâ€¦" : "Sync from Accurate"}
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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 6 â€" Warehouse
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
      setFormError(apiErr(err, "Gagal update gudang"));
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
          {syncMut.isPending ? "Syncingâ€¦" : "Sync from Accurate"}
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

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 7 â€" Shift Master
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function ShiftTab() {
  const [formOpen, setFormOpen]   = useState(false);
  const [editShift, setEdit]      = useState<ShiftMaster | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: shifts = [], isLoading } = useShiftMasters();
  const createMut = useCreateShift();
  const updateMut = useUpdateShift(editShift?.id ?? "");
  const deleteMut = useDeleteShift();

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  async function handleDelete(shift: ShiftMaster) {
    try { await deleteMut.mutateAsync(shift.id); } catch { /* ignored */ }
  }
  function openEdit(s: ShiftMaster) { setEdit(s); setFormError(null); setFormOpen(true); }

  async function handleSubmit(values: ShiftFormValues) {
    setFormError(null);
    try {
      const payload = {
        code:      values.code,
        name:      values.name,
        startTime: values.startTime || undefined,
        endTime:   values.endTime || undefined,
        color:     values.color || undefined,
        isWorking: values.isWorking,
      };
      if (editShift) {
        await updateMut.mutateAsync({ ...payload, isActive: values.isActive });
      } else {
        await createMut.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(apiErr(err, "Gagal menyimpan shift"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Master Shift</h2>
          <p className="text-sm text-muted-foreground">Kelola jam kerja dan jenis shift karyawan</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Tambah Shift
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ShiftTable shifts={shifts} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
        </CardContent>
      </Card>

      <ShiftForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending}
        defaultValues={editShift}
        error={formError}
      />
    </div>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Main SettingsPage
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const TABS = [
  { value: "employees",       label: "Karyawan" },
  { value: "users",           label: "User" },
  { value: "branches",        label: "Cabang" },
  { value: "payment-methods", label: "Pembayaran" },
  { value: "cash-accounts",   label: "Kas" },
  { value: "warehouses",      label: "Gudang" },
  { value: "shifts",          label: "Shift" },
  { value: "salary",          label: "Gaji" },
  { value: "loans",           label: "Kasbon" },
  { value: "komisi",          label: "Komisi" },
  { value: "leave-types",     label: "Tipe Cuti" },
  { value: "leave-quotas",    label: "Kuota Cuti" },
  { value: "memberships",     label: "Membership" },
  { value: "accurate",        label: "Accurate" },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<string>("employees");

  return (
    <PageContainer>
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Settings</h1>
        <p className="text-sm text-slate-500">Manage employees, users, branches, and configuration</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="mt-6">
        {/* â"€â"€ Mobile: native select â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <div className="md:hidden mb-4">
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

        {/* Desktop: vertical split-pane */}
        <div className="md:flex md:min-h-[calc(100vh-12rem)]">
          <TabsList className="hidden md:flex flex-col w-48 shrink-0 border-r border-border bg-card h-auto items-start justify-start gap-0 rounded-none p-0 pt-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="w-full justify-start rounded-none px-4 py-2.5 text-sm font-medium text-slate-500 bg-transparent shadow-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-slate-900 hover:text-slate-900 hover:bg-muted/50 transition-colors"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-w-0">
            <TabsContent value="employees"       className="mt-0 p-6"><EmployeeTab /></TabsContent>
            <TabsContent value="users"           className="mt-0 p-6"><UserTab /></TabsContent>
            <TabsContent value="branches"        className="mt-0 p-6"><BranchTab /></TabsContent>
            <TabsContent value="payment-methods" className="mt-0 p-6"><PaymentMethodTab /></TabsContent>
            <TabsContent value="cash-accounts"   className="mt-0 p-6"><CashAccountTab /></TabsContent>
            <TabsContent value="warehouses"      className="mt-0 p-6"><WarehouseTab /></TabsContent>
            <TabsContent value="shifts"          className="mt-0 p-6"><ShiftTab /></TabsContent>
            <TabsContent value="salary"          className="mt-0 p-6"><SalaryTab /></TabsContent>
            <TabsContent value="loans"           className="mt-0 p-6"><LoanTab /></TabsContent>
            <TabsContent value="komisi"          className="mt-0 p-6"><CommissionSettingsTab /></TabsContent>
            <TabsContent value="leave-types"     className="mt-0 p-6"><LeaveTypeTab /></TabsContent>
            <TabsContent value="leave-quotas"    className="mt-0 p-6"><LeaveQuotaTab /></TabsContent>
            <TabsContent value="memberships"     className="mt-0 p-6"><MembershipTab /></TabsContent>
            <TabsContent value="accurate"        className="mt-0 p-6"><AccuratePanel /></TabsContent>
          </div>
        </div>
      </Tabs>
    </PageContainer>
  );
}

