import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users, RefreshCw, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/common/Pagination";

import {
  useEmployeeRoles, useCreateEmployeeRole, useUpdateEmployeeRole, useDeleteEmployeeRole,
  useUsers, useCreateUser, useUpdateUser, useResetUserPassword, useDeleteUser,
  useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, useSyncBranchesFromAccurate, useMapBranchToAccurate,
  usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod,
  useCashAccounts, useCreateCashAccount, useUpdateCashAccount, useDeleteCashAccount,
  useWarehouses, useSyncWarehouses, useUpdateWarehouseBranch, useUpdateWarehouseAccurate, useDeleteWarehouse,
  useShiftMasters, useCreateShift, useUpdateShift, useDeleteShift,
  useAllGlAccounts, useSyncAllGlAccounts, useUpdateGlAccountUsage,
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
import { AccuratePanel }           from "../accurate/AccuratePanel";
import { PayrollGlAccountTab }     from "../components/payrollGlAccount/PayrollGlAccountTab";
import { LeaveSettingsTab }        from "../components/leave/LeaveSettingsTab";
import { MembershipTab }           from "../components/membership/MembershipTab";
import { AttendanceSettingsTab }   from "../components/attendance/AttendanceSettingsTab";
import { HolidayTab }              from "../components/holiday/HolidayTab";

import type { EmployeeRole, User, Branch, PaymentMethod, CashAccount, Warehouse, ShiftMaster } from "../types";
import type { BranchSyncResult } from "../api/branch.api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
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
  const [formOpen, setFormOpen]           = useState(false);
  const [editUser, setEditUser]           = useState<User | null>(null);
  const [formError, setFormError]         = useState<string | null>(null);
  const [pwOpen, setPwOpen]               = useState(false);
  const [pwUser, setPwUser]               = useState<User | null>(null);
  const [pwError, setPwError]             = useState<string | null>(null);
  const [userSearch, setUserSearch]       = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [branchFilter, setBranchFilter]   = useState("");
  const [userPage, setUserPage]           = useState(1);

  const { data: branchData } = useBranches({ limit: 100 });
  const allBranches = branchData?.data ?? [];

  const { data, isLoading } = useUsers({
    page: userPage, limit: 20,
    search:   debouncedUser || undefined,
    branchId: branchFilter  || undefined,
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

  function handleBranchFilter(e: React.ChangeEvent<HTMLSelectElement>) {
    setBranchFilter(e.target.value);
    setUserPage(1);
  }

  const createMut  = useCreateUser();
  const updateMut  = useUpdateUser(editUser?.id ?? "");
  const resetPwMut = useResetUserPassword(pwUser?.id ?? "");
  const deleteMut  = useDeleteUser();

  function openCreate() { setEditUser(null); setFormError(null); setFormOpen(true); }
  function openEdit(user: User) { setEditUser(user); setFormError(null); setFormOpen(true); }
  function openResetPw(user: User) { setPwUser(user); setPwError(null); setPwOpen(true); }

  async function handleDeleteUser(user: User) {
    try { await deleteMut.mutateAsync(user.id); } catch { /* ignored */ }
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
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">User Accounts</span>
            {userMeta && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {userMeta.total} user
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari email, karyawan…"
                value={userSearch}
                onChange={handleUserSearch}
                className="h-8 pl-8 text-xs w-44 border-slate-200 bg-white"
              />
            </div>
            {/* Branch filter */}
            <select
              value={branchFilter}
              onChange={handleBranchFilter}
              className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Semua Cabang</option>
              {allBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />New User
            </Button>
          </div>
        </div>

        {/* Table */}
        <UserTable users={users} isLoading={isLoading} onEdit={openEdit} onResetPw={openResetPw} onDelete={handleDeleteUser} />
      </div>

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

  // Accurate mapping dialog state
  const [syncResult, setSyncResult]               = useState<BranchSyncResult | null>(null);
  const [mappingOpen, setMappingOpen]             = useState(false);
  const [selections, setSelections]               = useState<Record<number, string>>({});
  const [mappingError, setMappingError]           = useState<string | null>(null);

  const { data, isLoading } = useBranches({ limit: 100 });
  const branches = data?.data ?? [];

  const createMut  = useCreateBranch();
  const updateMut  = useUpdateBranch(editBranch?.id ?? "");
  const deleteMut  = useDeleteBranch();
  const syncMut    = useSyncBranchesFromAccurate();
  const mapMut     = useMapBranchToAccurate();

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  function openEdit(b: Branch) { setEdit(b); setFormError(null); setFormOpen(true); }
  async function handleDelete(b: Branch) {
    try { await deleteMut.mutateAsync(b.id); } catch { /* error shown by hook onError toast */ }
  }

  async function handleSync() {
    try {
      const result = await syncMut.mutateAsync();
      if (result.unmatched > 0) {
        setSyncResult(result);
        setSelections({});
        setMappingError(null);
        setMappingOpen(true);
      }
    } catch { /* toast handled by hook */ }
  }

  async function handleConfirmMapping() {
    setMappingError(null);
    const entries = Object.entries(selections).filter(([, branchId]) => branchId !== "");
    if (entries.length === 0) {
      setMappingOpen(false);
      return;
    }
    try {
      await Promise.all(
        entries.map(([accurateId, branchId]) =>
          mapMut.mutateAsync({ branchId, accurateBranchId: Number(accurateId) })
        )
      );
      setMappingOpen(false);
    } catch (err: unknown) {
      setMappingError(apiErr(err, "Gagal menyimpan mapping"));
    }
  }

  async function handleSubmit(values: BranchFormValues) {
    setFormError(null);
    const latParsed  = values.latitude     ? parseFloat(values.latitude)       : NaN;
    const lngParsed  = values.longitude    ? parseFloat(values.longitude)      : NaN;
    const radParsed  = values.radiusMeters ? parseInt(values.radiusMeters, 10) : NaN;
    const payload = {
      code:         values.code,
      name:         values.name,
      address:      values.address  || undefined,
      city:         values.city     || undefined,
      province:     values.province || undefined,
      phone:        values.phone    || undefined,
      latitude:     isNaN(latParsed) ? undefined : latParsed,
      longitude:    isNaN(lngParsed) ? undefined : lngParsed,
      radiusMeters: isNaN(radParsed) ? undefined : radParsed,
    };
    try {
      if (editBranch) {
        await updateMut.mutateAsync(payload);
      } else {
        await createMut.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(apiErr(err, "Gagal menyimpan cabang"));
    }
  }

  // Branches that are not yet mapped (no accurateBranchId)
  const unmappedLocal = branches.filter((b) => !b.accurateBranchId);
  const localOptions  = unmappedLocal.map((b) => ({ value: b.id, label: b.name }));

  // Accurate branches that weren't auto-matched
  const unmatchedAccurate = syncResult?.results.filter((r) => r.status === "unmatched") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Branches</h2>
          <p className="text-sm text-muted-foreground">Salon locations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncMut.isPending}
          >
            {syncMut.isPending ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            )}
            Sync Accurate
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />New Branch
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <BranchTable branches={branches} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
        </CardContent>
      </Card>

      {/* Manual Mapping Dialog — shown when auto-sync couldn't match all Accurate branches */}
      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mapping Manual Cabang Accurate</DialogTitle>
            <DialogDescription>
              {unmatchedAccurate.length} cabang dari Accurate tidak cocok secara otomatis.
              Pilih cabang lokal yang sesuai untuk setiap nama Accurate di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {unmatchedAccurate.map((acc) => (
              <div key={acc.accurateBranchId} className="grid grid-cols-2 items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">ID Accurate: {acc.accurateBranchId}</p>
                </div>
                <SimpleSelect
                  value={selections[acc.accurateBranchId] ?? ""}
                  onChange={(val) =>
                    setSelections((prev) => ({ ...prev, [acc.accurateBranchId]: val }))
                  }
                  options={localOptions}
                  placeholder="— Pilih cabang —"
                />
              </div>
            ))}

            {unmatchedAccurate.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Semua cabang sudah ter-mapping.
              </p>
            )}

            {mappingError && (
              <p className="text-sm text-destructive">{mappingError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingOpen(false)} disabled={mapMut.isPending}>
              Lewati
            </Button>
            <Button
              onClick={handleConfirmMapping}
              disabled={mapMut.isPending || Object.values(selections).every((v) => !v)}
            >
              {mapMut.isPending ? (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
              ) : null}
              Simpan Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
function PaymentMethodSubTab() {
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
    try { await deleteMut.mutateAsync(m.id); } catch { /* handled */ }
  }

  async function handleSubmit(values: PaymentMethodFormValues) {
    setFormError(null);
    try {
      const payload = { code: values.code, name: values.name, cashAccountId: values.cashAccountId || undefined };
      if (editMethod) { await updateMut.mutateAsync(payload); } else { await createMut.mutateAsync(payload); }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(apiErr(err, "Gagal menyimpan metode bayar"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Metode Pembayaran</h2>
          <p className="text-xs text-muted-foreground">Konfigurasi metode pembayaran yang diterima</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah</Button>
      </div>
      <Card><CardContent className="p-0">
        <PaymentMethodTable methods={methods} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
      </CardContent></Card>
      <PaymentMethodForm open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending} defaultValues={editMethod} error={formError} />
    </div>
  );
}

function CashAccountSubTab() {
  const [formOpen, setFormOpen]       = useState(false);
  const [editAccount, setEdit]        = useState<CashAccount | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [confirmAccount, setConfirm]  = useState<CashAccount | null>(null);

  const { data, isLoading, refetch, isFetching } = useCashAccounts({ limit: 100 });
  const allAccounts = data?.data ?? [];
  const accounts    = showInactive ? allAccounts : allAccounts.filter((a) => a.isActive);

  const createMut = useCreateCashAccount();
  const updateMut = useUpdateCashAccount(editAccount?.id ?? "");
  const deleteMut = useDeleteCashAccount();

  function openCreate() { setEdit(null); setFormError(null); setFormOpen(true); }
  function openEdit(a: CashAccount) { setEdit(a); setFormError(null); setFormOpen(true); }

  function handleDelete(a: CashAccount) { setConfirm(a); }
  async function confirmDelete() {
    if (!confirmAccount) return;
    try {
      await deleteMut.mutateAsync(confirmAccount.id);
      setConfirm(null);
    } catch (err: unknown) {
      toast.error(apiErr(err, "Gagal menonaktifkan akun"));
      setConfirm(null);
    }
  }

  async function handleSubmit(values: CashAccountFormValues) {
    setFormError(null);
    try {
      if (editAccount) {
        await updateMut.mutateAsync({
          name:              values.name,
          accurateAccountId: values.accurateAccountId ? Number(values.accurateAccountId) : undefined,
          accurateAccountNo: values.accurateAccountNo || undefined,
        });
      } else {
        await createMut.mutateAsync({
          code:              values.code.toUpperCase(),
          name:              values.name,
          accurateAccountId: values.accurateAccountId ? Number(values.accurateAccountId) : undefined,
          accurateAccountNo: values.accurateAccountNo || undefined,
        });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(apiErr(err, "Gagal menyimpan akun kas"));
    }
  }

  const inactiveCount = allAccounts.filter((a) => !a.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Cash Account</h2>
          <p className="text-xs text-muted-foreground">Akun yang ditag "Cash Account" di Settings → GL Akun</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-3 w-3 mr-1.5" />
            Tambah
          </Button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Reload daftar cash account dari database"
          >
            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Reload
          </button>
        </div>
      </div>

      {inactiveCount > 0 && (
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {showInactive ? "Sembunyikan inactive" : `Tampilkan ${inactiveCount} akun inactive`}
        </button>
      )}

      <Card><CardContent className="p-0">
        <CashAccountTable accounts={accounts} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
      </CardContent></Card>

      {/* Confirm delete dialog */}
      {confirmAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background border border-border p-6 shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold mb-2">Hapus akun?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Akun <span className="font-medium text-foreground">"{confirmAccount.name}"</span> akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setConfirm(null)} disabled={deleteMut.isPending}>Batal</Button>
              <Button size="sm" variant="destructive" onClick={confirmDelete} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      <CashAccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={createMut.isPending || updateMut.isPending}
        defaultValues={editAccount}
        error={formError}
      />
    </div>
  );
}

function PaymentMethodTab() {
  const [subTab, setSubTab] = useState<"methods" | "cash">("methods");
  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-border">
        {([["methods", "Metode Bayar"], ["cash", "Cash Account"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              subTab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>{label}</button>
        ))}
      </div>
      {subTab === "methods" ? <PaymentMethodSubTab /> : <CashAccountSubTab />}
    </div>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Tab 5 â€" Cash Account
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const GL_ACCOUNT_LIMIT = 10;

const GL_USAGE_OPTIONS = [
  { value: "",                  label: "— Tidak ada —" },
  { value: "STOCK_ADJUSTMENT",  label: "Penyesuaian Stok" },
  { value: "CASH_ACCOUNT",      label: "Cash Account" },
];

function GlUsageBadge({ usage }: { usage: string | null }) {
  if (!usage) return <span className="text-xs text-muted-foreground italic">Belum diset</span>;
  if (usage === "STOCK_ADJUSTMENT") return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Penyesuaian Stok</span>;
  if (usage === "CASH_ACCOUNT")     return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Cash Account</span>;
  return <span className="text-xs text-muted-foreground">{usage}</span>;
}

function GlAccountsTab() {
  const { data: glAccounts = [], isLoading } = useAllGlAccounts();
  const syncMut   = useSyncAllGlAccounts();
  const usageMut  = useUpdateGlAccountUsage();
  const [glPage, setGlPage]         = useState(1);
  const [glSearch, setGlSearch]     = useState("");
  const [glCategory, setGlCategory] = useState("");
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");

  const categoryOptions = Array.from(
    new Set(glAccounts.map((a) => a.category).filter(Boolean))
  ).sort() as string[];

  const filtered = glAccounts.filter((a) => {
    const q = glSearch.toLowerCase();
    const matchSearch =
      (a.number ?? "").toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.category ?? "").toLowerCase().includes(q);
    const matchCategory = glCategory === "" || a.category === glCategory;
    return matchSearch && matchCategory;
  });

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / GL_ACCOUNT_LIMIT));
  const paged      = filtered.slice((glPage - 1) * GL_ACCOUNT_LIMIT, glPage * GL_ACCOUNT_LIMIT);

  const resetFilters = () => { setGlSearch(""); setGlCategory(""); setGlPage(1); };

  function startEdit(id: string, current: string | null) {
    setEditingId(id);
    setEditValue(current ?? "");
  }

  function cancelEdit() { setEditingId(null); setEditValue(""); }

  async function saveEdit(id: string) {
    await usageMut.mutateAsync({ id, usage: editValue || null });
    setEditingId(null);
    setEditValue("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">GL Akun</h2>
          <p className="text-sm text-muted-foreground">Semua akun dari Accurate Online — sync untuk memperbarui</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { syncMut.mutate(); resetFilters(); }} disabled={syncMut.isPending}>
          {syncMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
          Sync GL Akun dari Accurate
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari no. akun atau nama..."
            value={glSearch}
            onChange={(e) => { setGlSearch(e.target.value); setGlPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <select
          value={glCategory}
          onChange={(e) => { setGlCategory(e.target.value); setGlPage(1); }}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Semua Kategori</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(glSearch || glCategory) && (
          <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Reset filter
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
          ) : glAccounts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Belum ada akun — klik Sync GL Akun dari Accurate</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada akun yang cocok dengan pencarian</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">No. Akun</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">Kategori</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-56">Penggunaan</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.number ?? "—"}</td>
                      <td className="px-4 py-2.5">{a.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.category ?? "—"}</td>
                      <td className="px-4 py-2">
                        {editingId === a.id ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {GL_USAGE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveEdit(a.id)}
                              disabled={usageMut.isPending}
                              className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              {usageMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">✓</span>}
                            </button>
                            <button onClick={cancelEdit} className="flex h-7 w-7 items-center justify-center rounded border border-input hover:bg-muted text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <GlUsageBadge usage={a.usage} />
                            <button
                              onClick={() => startEdit(a.id, a.usage)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3.5 w-3.5 rotate-0" style={{ transform: a.usage ? undefined : undefined }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination
          page={glPage}
          limit={GL_ACCOUNT_LIMIT}
          total={total}
          totalPages={totalPages}
          onPageChange={setGlPage}
        />
      )}
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
  const deleteMut             = useDeleteWarehouse();

  const isPending = updateBranchMut.isPending || updateAccurateMut.isPending;

  function openEdit(wh: Warehouse) {
    setEditWh(wh);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleDelete(wh: Warehouse) {
    try { await deleteMut.mutateAsync(wh.id); } catch { /* error shown by hook onError toast */ }
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
          <WarehouseTable warehouses={warehouses} isLoading={isLoading} onEdit={openEdit} onDelete={handleDelete} />
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
  { value: "gl-accounts",     label: "GL Akun" },
  { value: "warehouses",      label: "Gudang" },
  { value: "shifts",          label: "Shift" },
  { value: "leave",           label: "Cuti" },
  { value: "memberships",     label: "Membership" },
  { value: "holidays",        label: "Hari Libur" },
  { value: "attendance",      label: "Absensi" },
  { value: "payroll-gl",      label: "Akun Gaji" },
  { value: "accurate",        label: "Accurate" },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState<string>("employees");

  return (
    <PageContainer title="Pengaturan" subtitle="Kelola karyawan, pengguna, cabang, dan konfigurasi">
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
            <TabsContent value="gl-accounts"     className="mt-0 p-6"><GlAccountsTab /></TabsContent>
            <TabsContent value="warehouses"      className="mt-0 p-6"><WarehouseTab /></TabsContent>
            <TabsContent value="shifts"          className="mt-0 p-6"><ShiftTab /></TabsContent>
            <TabsContent value="leave"           className="mt-0 p-6"><LeaveSettingsTab /></TabsContent>
            <TabsContent value="memberships"     className="mt-0 p-6"><MembershipTab /></TabsContent>
            <TabsContent value="holidays"        className="mt-0 p-6"><HolidayTab /></TabsContent>
            <TabsContent value="attendance"      className="mt-0 p-6"><AttendanceSettingsTab /></TabsContent>
            <TabsContent value="payroll-gl"      className="mt-0 p-6"><PayrollGlAccountTab /></TabsContent>
            <TabsContent value="accurate"        className="mt-0 p-6"><AccuratePanel /></TabsContent>
          </div>
        </div>
      </Tabs>
    </PageContainer>
  );
}

