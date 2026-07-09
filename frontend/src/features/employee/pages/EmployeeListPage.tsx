import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, EyeOff, Building2, Trash2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap gap-3">

              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Cari nama, kode, email..."
                  className="pl-8 h-9"
                />
              </div>

              {/* Branch filter — only SUPER_ADMIN sees all branches */}
              {isSuperAdmin && branches.length > 0 && (
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={filterBranch}
                    onChange={(e) => { setFilterBranch(e.target.value); setPage(1); }}
                    className="h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer"
                  >
                    <option value="">Semua Cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active status toggle */}
              <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
                {[
                  { label: "Aktif",    value: true  as boolean | undefined },
                  { label: "Semua",    value: undefined },
                  { label: "Nonaktif", value: false as boolean | undefined },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => { setIsActive(opt.value); setPage(1); }}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : employees.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Tidak ada karyawan ditemukan.
              </p>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-border md:hidden">
                  {employees.map((e) => (
                    <div key={e.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.employeeCode} · {e.role.name}</p>
                          {e.homeBranch && (
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{e.homeBranch.name}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge variant={e.isActive ? "default" : "secondary"} className="text-xs">
                            {e.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                            <Link to={`/employees/${e.id}`}>
                              <Eye className="mr-1 h-3 w-3" />
                              Detail
                            </Link>
                          </Button>
                          {canDelete && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                                title="Nonaktifkan"
                                onClick={() => { setConfirmDeleteId(null); setConfirmDeactivateId(e.id); }}>
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Hapus permanen"
                                onClick={() => { setConfirmDeactivateId(null); setConfirmDeleteId(e.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setConfirmDeactivateId(null)}>
                              Batal
                            </Button>
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
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setConfirmDeleteId(null)}>
                              Batal
                            </Button>
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
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                        {isSuperAdmin && (
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>
                        )}
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kontak</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Komisi</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => (
                        <tr key={e.id} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.employeeCode ?? "—"}</td>
                          <td className="px-4 py-3 font-medium">{e.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.role.name}</td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              {e.homeBranch ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  {e.homeBranch.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div>{e.phone ?? "—"}</div>
                            <div>{e.email ?? "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            {e.commissionEnabled ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">Aktif</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={e.isActive ? "default" : "secondary"}>
                              {e.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {confirmDeactivateId === e.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Nonaktifkan?
                                </span>
                                <Button variant="outline" size="sm" className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                                  onClick={() => { deactivateMutation.mutate(e.id); setConfirmDeactivateId(null); }}>
                                  Ya
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => setConfirmDeactivateId(null)}>
                                  Batal
                                </Button>
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
                                <Button variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => setConfirmDeleteId(null)}>
                                  Batal
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={`/employees/${e.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                {canDelete && (
                                  <>
                                    <Button variant="ghost" size="icon" title="Nonaktifkan"
                                      className="text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                                      onClick={() => { setConfirmDeleteId(null); setConfirmDeactivateId(e.id); }}>
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Hapus permanen"
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => { setConfirmDeactivateId(null); setConfirmDeleteId(e.id); }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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
          </CardContent>
        </Card>

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
