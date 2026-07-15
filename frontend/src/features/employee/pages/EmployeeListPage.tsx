import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, ChevronRight, EyeOff, Building2, Trash2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { fetchAllBranches } from "@/features/settings/api/branch.api";
import { useEmployees, useCreateEmployee, useUploadEmployeeFiles, useDeactivateEmployee, useDeleteEmployee } from "../hooks";
import { updateEmployeeBranches } from "../api";
import { EmployeeCreateForm } from "../components/EmployeeForm";
import type { CreateEmployeeFormValues } from "../schemas/employee.schema";

function apiErr(err: unknown, fallback = "Terjadi kesalahan"): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export function EmployeeListPage() {
  const { branchId: sessionBranchId, user } = useAuthStore();
  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";
  const isManager    = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(user?.role?.code ?? "");

  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [isActive, setIsActive]   = useState<boolean | undefined>(true);
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [formOpen, setFormOpen]               = useState(false);
  const [formError, setFormError]             = useState<string | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId]         = useState<string | null>(null);

  // Load branch list for filter (only for managers+)
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-all"],
    queryFn:  fetchAllBranches,
    enabled:  isManager,
  });

  // Non-SUPER_ADMIN: always locked to their session branch
  // SUPER_ADMIN/OWNER/MANAGER: use selected filter (empty = all)
  const branchFilter = isSuperAdmin
    ? (filterBranch || undefined)
    : (sessionBranchId ?? undefined);

  const { data, isLoading } = useEmployees({
    page,
    limit:    20,
    search:   search || undefined,
    isActive,
    branchId: branchFilter,
  });
  const createMutation      = useCreateEmployee();
  const uploadFilesMutation = useUploadEmployeeFiles();
  const deactivateMutation  = useDeactivateEmployee();
  const deleteMutation      = useDeleteEmployee();

  const canDelete = ["SUPER_ADMIN", "OWNER"].includes(user?.role?.code ?? "");

  const employees  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  async function handleCreate(values: CreateEmployeeFormValues, files: { ktpFile?: File | null; contractFile?: File | null }) {
    setFormError(null);
    try {
      const created = await createMutation.mutateAsync({
        name:              values.name,
        roleId:            values.roleId,
        employeeCode:      values.employeeCode     || undefined,
        phone:             values.phone            || undefined,
        email:             values.email            || undefined,
        hireDate:          values.hireDate         || undefined,
        birthDate:         values.birthDate        || undefined,
        address:           values.address          || undefined,
        emergencyContact:  values.emergencyContact || undefined,
        nikKtp:            values.nikKtp           || undefined,
        resignDate:        values.resignDate        || undefined,
        commissionEnabled: values.commissionEnabled,
        homeBranchId:      values.homeBranchId     || undefined,
      });
      if ((values.branchIds ?? []).length > 0) {
        await updateEmployeeBranches(created.id, { branchIds: values.branchIds });
      }
      if (files.ktpFile || files.contractFile) {
        await uploadFilesMutation.mutateAsync({ id: created.id, files });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(apiErr(err, "Gagal menambahkan karyawan"));
    }
  }

  const selectedBranchName = branches.find((b) => b.id === filterBranch)?.name;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Karyawan</h1>
            <p className="text-sm text-muted-foreground">
              {meta
                ? `${meta.total} karyawan${selectedBranchName ? ` · ${selectedBranchName}` : ""}`
                : "Kelola data karyawan"}
            </p>
          </div>
          <Button onClick={() => { setFormError(null); setFormOpen(true); }} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Karyawan
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama, kode, email..."
              className="pl-8 h-9 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md"
            />
          </div>

          {/* Branch filter */}
          {isSuperAdmin && branches.length > 0 && (
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={filterBranch}
                onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}
                className="h-9 rounded-xl border border-slate-200 bg-white shadow-sm pl-8 pr-3 text-sm focus:outline-none hover:shadow-md transition-shadow appearance-none cursor-pointer"
              >
                <option value="">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Active status toggle */}
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white shadow-sm p-1">
            {[
              { label: "Aktif",    value: true  as boolean | undefined },
              { label: "Semua",    value: undefined },
              { label: "Nonaktif", value: false as boolean | undefined },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { setIsActive(opt.value); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table — flat border, no card */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-3.5 w-16 font-mono" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-lg" />
                  <Skeleton className="h-5 w-14 rounded-lg" />
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-400">
              Tidak ada karyawan ditemukan.
            </p>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y divide-slate-100 md:hidden">
                {employees.map((e) => (
                  <div key={e.id} className="px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-800">{e.name}</p>
                          <Badge variant="outline" className={`text-xs shrink-0 rounded-lg px-2 py-0.5 ${e.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                            {e.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{e.employeeCode} · {e.role.name}</p>
                        {e.homeBranch && (
                          <p className="text-xs text-slate-400 mt-0.5">{e.homeBranch.name}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Link to={`/employees/${e.id}`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        {canDelete && (
                          <>
                            <button type="button" className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              onClick={() => { setConfirmDeleteId(null); setConfirmDeactivateId(e.id); }}>
                              <EyeOff className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => { setConfirmDeactivateId(null); setConfirmDeleteId(e.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {confirmDeactivateId === e.id && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Nonaktifkan karyawan ini?
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs border-amber-400 text-amber-700"
                            onClick={() => { deactivateMutation.mutate(e.id); setConfirmDeactivateId(null); }}>
                            Ya, Nonaktifkan
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeactivateId(null)}>Batal</Button>
                        </div>
                      </div>
                    )}
                    {confirmDeleteId === e.id && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Hapus permanen? Data tidak bisa dikembalikan.
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" className="h-7 text-xs"
                            onClick={() => { deleteMutation.mutate(e.id); setConfirmDeleteId(null); }}>
                            Ya, Hapus
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kode</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                      {isSuperAdmin && (
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cabang</th>
                      )}
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kontak</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Komisi</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((e) => (
                      <tr key={e.id} className="group hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{e.employeeCode ?? "—"}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{e.name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{e.role.name}</td>
                        {isSuperAdmin && (
                          <td className="px-5 py-3.5">
                            {e.homeBranch ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {e.homeBranch.name}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          <div className="tabular-nums">{e.phone ?? "—"}</div>
                          <div className="text-slate-400">{e.email ?? "—"}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          {e.commissionEnabled ? (
                            <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Aktif</Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className={`text-xs rounded-lg px-2 py-0.5 ${e.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                            {e.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {confirmDeactivateId === e.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Nonaktifkan?
                              </span>
                              <Button variant="outline" size="sm" className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                                onClick={() => { deactivateMutation.mutate(e.id); setConfirmDeactivateId(null); }}>
                                Ya
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeactivateId(null)}>Batal</Button>
                            </div>
                          ) : confirmDeleteId === e.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Hapus permanen?
                              </span>
                              <Button variant="destructive" size="sm" className="h-7 text-xs"
                                onClick={() => { deleteMutation.mutate(e.id); setConfirmDeleteId(null); }}>
                                Ya
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDeleteId(null)}>Batal</Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                to={`/employees/${e.id}`}
                                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                              >
                                Lihat <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                              {canDelete && (
                                <>
                                  <button type="button" title="Nonaktifkan"
                                    className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                    onClick={() => { setConfirmDeleteId(null); setConfirmDeactivateId(e.id); }}>
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" title="Hapus permanen"
                                    className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => { setConfirmDeactivateId(null); setConfirmDeleteId(e.id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Halaman {meta?.page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <EmployeeCreateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        error={formError}
      />
    </PageContainer>
  );
}
