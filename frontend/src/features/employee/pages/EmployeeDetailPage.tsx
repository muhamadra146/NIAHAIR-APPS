import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, Pencil, Plus, Check, Phone, Mail, MapPin,
  Calendar, FileText, ShieldCheck, Banknote, Building2,
  AlertCircle, User, CreditCard, Lock, Eye, EyeOff,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { api } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";
import type { ApiResponse } from "@/types/api";
import {
  useEmployee,
  useUpdateEmployee,
  useUploadEmployeeFiles,
  useUpdateEmployeeBranches,
  useSalarySettings,
  useCreateSalarySetting,
  useUpdateSalarySetting,
} from "../hooks";
import { EmployeeUpdateForm } from "../components/EmployeeForm";
import { SalarySettingForm } from "../components/SalarySettingForm";
import type { UpdateEmployeeFormValues, SalarySettingFormValues } from "../schemas/employee.schema";
import type { SalarySetting } from "../types";

async function changeMyPassword(currentPassword: string, newPassword: string) {
  const { data } = await api.patch<ApiResponse<{ message: string }>>("/users/me/password", {
    currentPassword,
    newPassword,
  });
  return data.data;
}

function apiErr(err: unknown, fallback = "Terjadi kesalahan"): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-blue-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
];

function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isOwnProfile = user?.employee?.id === id;

  const { data: employee, isLoading, isError } = useEmployee(id!);
  const updateMutation       = useUpdateEmployee(id!);
  const uploadFilesMutation  = useUploadEmployeeFiles();
  const updateBranchMutation = useUpdateEmployeeBranches(id!);
  const { data: salarySettings = [], isLoading: salaryLoading } = useSalarySettings(id!);

  const [editOpen, setEditOpen]   = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [ssOpen, setSsOpen]       = useState(false);
  const [ssError, setSsError]     = useState<string | null>(null);
  const [editSs, setEditSs]       = useState<SalarySetting | null>(null);
  const [viewFile, setViewFile]   = useState<{ url: string; label: string } | null>(null);

  async function handleFileDownload(url: string, label: string) {
    const isPdf = url.includes("/raw/upload/");
    const filename = label.replace(/\s+/g, "_") + (isPdf ? ".pdf" : ".jpg");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const changePasswordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changeMyPassword(current, next),
    onSuccess: () => toast.success("Password berhasil diubah"),
    onError: (err: Error) => toast.error(err.message),
  });

  const createSsMutation = useCreateSalarySetting(id!);
  const updateSsMutation = useUpdateSalarySetting(id!, editSs?.id ?? "");

  async function handleUpdate(values: UpdateEmployeeFormValues, files: { ktpFile?: File | null; contractFile?: File | null }) {
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
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
        resignDate:        values.resignDate       || undefined,
        commissionEnabled: values.commissionEnabled,
        payDay:            values.payDay ?? null,
        isActive:          values.isActive,
        homeBranchId:      values.homeBranchId     || null,
      });
      await updateBranchMutation.mutateAsync({ branchIds: values.branchIds ?? [] });
      if (files.ktpFile || files.contractFile) {
        await uploadFilesMutation.mutateAsync({ id: id!, files });
      }
      setEditOpen(false);
    } catch (err: unknown) {
      setEditError(apiErr(err, "Gagal memperbarui"));
    }
  }

  async function handleSalarySave(values: SalarySettingFormValues) {
    setSsError(null);
    try {
      const shared = {
        baseSalary:                   values.baseSalary,
        mealAllowancePerDay:          values.mealAllowancePerDay,
        tunjangan:                    values.tunjangan,
        transportAllowance:           values.transportAllowance,
        overtimeRatePerHour:          values.overtimeRatePerHour,
        holidayRatePerDay:            values.holidayRatePerDay,
        lateDeductionBracket1:        values.lateDeductionBracket1,
        lateDeductionBracket2:        values.lateDeductionBracket2,
        lateDeductionBracket3:        values.lateDeductionBracket3,
        absentDeductionPerDay:        values.absentDeductionPerDay,
        earlyLeaveDeductionPerMinute: values.earlyLeaveDeductionPerMinute,
        bpjsJhtPercent:               values.bpjsJhtPercent,
        bpjsJhtEmployerPercent:       values.bpjsJhtEmployerPercent,
        bpjsJpPercent:                values.bpjsJpPercent,
        bpjsJpEmployerPercent:        values.bpjsJpEmployerPercent,
        bpjsKesehatanEmployeePercent: values.bpjsKesehatanEmployeePercent,
        bpjsKesehatanEmployerPercent: values.bpjsKesehatanEmployerPercent,
        effectiveDate:                values.effectiveDate,
        endDate:                      values.endDate || undefined,
        isActive:                     values.isActive,
        notes:                        values.notes || undefined,
      };
      if (editSs) {
        await updateSsMutation.mutateAsync(shared);
      } else {
        await createSsMutation.mutateAsync({ employeeId: id!, ...shared });
      }
      setSsOpen(false);
      setEditSs(null);
    } catch (err: unknown) {
      setSsError(apiErr(err, "Gagal menyimpan setting gaji"));
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !employee) {
    return (
      <PageContainer>
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Karyawan tidak ditemukan.</p>
          <Link to="/employees" className="mt-2 inline-block text-sm text-primary underline">
            Kembali ke daftar
          </Link>
        </div>
      </PageContainer>
    );
  }

  const activeSetting = salarySettings.find((s) => s.isActive) ?? null;
  const primaryBranch = employee.employeeBranches?.find((b) => b.isPrimary)?.branch;

  return (
    <PageContainer>
      <div className="space-y-5">
        {/* Back nav */}
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
          <Link to="/employees"><ChevronLeft className="h-4 w-4" />Daftar Karyawan</Link>
        </Button>

        {/* Profile header card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {/* Gradient top bar */}
          <div className={`h-24 w-full bg-gradient-to-r ${avatarColor(employee.name)} opacity-20`} />

          <div className="px-5 pb-5">
            {/* Avatar */}
            <div className="relative -mt-12 mb-4 flex items-end justify-between">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(employee.name)} text-white text-2xl font-bold shadow-md ring-4 ring-white`}>
                {getInitials(employee.name)}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => { setEditError(null); setEditOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profil
              </Button>
            </div>

            {/* Name & identity */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{employee.name}</h1>
                <Badge variant={employee.isActive ? "default" : "secondary"} className="text-xs">
                  {employee.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
                {!employee.isActive && employee.resignDate && (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-200 bg-rose-50">
                    Resign {formatDate(employee.resignDate)}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{employee.employeeCode}</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {employee.role?.name}
                </span>
                {primaryBranch && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {primaryBranch.name}
                  </span>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatChip
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Bergabung"
                value={employee.hireDate ? formatDate(employee.hireDate) : "—"}
              />
              <StatChip
                icon={<Banknote className="h-3.5 w-3.5" />}
                label="Gajian"
                value={employee.payDay ? `Tgl ${employee.payDay}` : "—"}
              />
              <StatChip
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Komisi"
                value={employee.commissionEnabled ? "Aktif" : "Nonaktif"}
                valueClass={employee.commissionEnabled ? "text-emerald-600" : "text-muted-foreground"}
              />
              <StatChip
                icon={<Banknote className="h-3.5 w-3.5" />}
                label="Setting Gaji"
                value={activeSetting ? formatCurrency(activeSetting.baseSalary) : "Belum diset"}
                valueClass={activeSetting ? "" : "text-amber-600"}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="info">Info Personal</TabsTrigger>
            <TabsTrigger value="salary">
              Setting Gaji
              {salarySettings.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  {salarySettings.length}
                </span>
              )}
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="security">Keamanan</TabsTrigger>
            )}
          </TabsList>

          {/* Info personal tab */}
          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Contact */}
            <InfoSection title="Kontak" icon={<Phone className="h-4 w-4" />}>
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />}    label="No. HP"         value={employee.phone} />
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />}     label="Email"          value={employee.email} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}   label="Alamat"         value={employee.address} />
              <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Kontak Darurat" value={employee.emergencyContact} />
            </InfoSection>

            {/* Identity */}
            <InfoSection title="Identitas" icon={<CreditCard className="h-4 w-4" />}>
              <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label="NIK KTP"       value={employee.nikKtp} />
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />}   label="Tanggal Lahir" value={employee.birthDate ? formatDate(employee.birthDate) : null} />
              <InfoRow
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Foto KTP"
                value={
                  employee.ktpFileUrl
                    ? <button onClick={() => setViewFile({ url: employee.ktpFileUrl!, label: "Foto KTP" })} className="text-sm font-medium text-primary underline hover:opacity-70">Lihat File</button>
                    : null
                }
              />
              <InfoRow
                icon={<FileText className="h-3.5 w-3.5" />}
                label="File Kontrak"
                value={
                  employee.contractFileUrl
                    ? <button onClick={() => setViewFile({ url: employee.contractFileUrl!, label: "File Kontrak" })} className="text-sm font-medium text-primary underline hover:opacity-70">Lihat File</button>
                    : null
                }
              />
            </InfoSection>

            {/* Branch assignments */}
            {employee.employeeBranches && employee.employeeBranches.length > 0 && (
              <InfoSection title="Cabang" icon={<Building2 className="h-4 w-4" />}>
                <div className="flex flex-wrap gap-2">
                  {employee.employeeBranches.map((eb) => (
                    <div
                      key={eb.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        eb.isPrimary
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <Building2 className="h-3 w-3" />
                      {eb.branch.name}
                      {eb.isPrimary && <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px]">Utama</span>}
                    </div>
                  ))}
                </div>
              </InfoSection>
            )}
          </TabsContent>

          {/* Salary settings tab */}
          <TabsContent value="salary" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {activeSetting
                    ? <span className="text-emerald-600 font-medium">Setting aktif tersedia</span>
                    : <span className="text-amber-600 font-medium">Belum ada setting gaji aktif</span>}
                </p>
                <Button size="sm" onClick={() => { setEditSs(null); setSsError(null); setSsOpen(true); }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Tambah Setting
                </Button>
              </div>

              {salaryLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : salarySettings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Banknote className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada setting gaji.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => { setEditSs(null); setSsError(null); setSsOpen(true); }}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Buat Setting Pertama
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {salarySettings.map((s) => (
                    <SalarySettingCard
                      key={s.id}
                      setting={s}
                      onEdit={() => { setEditSs(s); setSsError(null); setSsOpen(true); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="security" className="mt-4">
              <ChangePasswordCard
                isPending={changePasswordMutation.isPending}
                onSubmit={(current, next) => changePasswordMutation.mutate({ current, next })}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <EmployeeUpdateForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        error={editError}
        employee={employee}
      />

      <SalarySettingForm
        open={ssOpen}
        onOpenChange={(v) => { setSsOpen(v); if (!v) setEditSs(null); }}
        onSubmit={handleSalarySave}
        isPending={createSsMutation.isPending || updateSsMutation.isPending}
        error={ssError}
        defaultValues={editSs}
      />

      {/* File viewer popup */}
      <Dialog open={!!viewFile} onOpenChange={(open) => { if (!open) setViewFile(null); }}>
        <DialogContent className="flex flex-col gap-0 p-0 max-w-3xl w-[95vw] h-[85vh]">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {viewFile?.label}
              </DialogTitle>
              {viewFile && (
                <button
                  type="button"
                  onClick={() => handleFileDownload(viewFile.url, viewFile.label)}
                  className="text-xs text-muted-foreground hover:text-foreground underline mr-6"
                >
                  Download
                </button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewFile && (
              viewFile.url.includes("/raw/upload/")
                ? (
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewFile.url)}&embedded=true`}
                    title={viewFile.label}
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center overflow-auto bg-muted/30 p-4">
                    <img
                      src={viewFile.url}
                      alt={viewFile.label}
                      className="max-w-full max-h-full object-contain rounded-lg shadow"
                    />
                  </div>
                )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function StatChip({
  icon, label, value, valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function InfoSection({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-muted-foreground/60">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-4">
        <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value ?? <span className="text-muted-foreground/50 font-normal">—</span>}</span>
      </div>
    </div>
  );
}

function SalarySettingCard({ setting, onEdit }: { setting: SalarySetting; onEdit: () => void }) {
  return (
    <Card className={setting.isActive ? "border-emerald-200 bg-emerald-50/30" : "opacity-75"}>
      <CardHeader className="flex-row items-start justify-between pb-2 pt-4">
        <div>
          <CardTitle className="text-sm font-semibold">
            {formatDate(setting.effectiveDate)}
            {setting.endDate && <span className="text-muted-foreground"> → {formatDate(setting.endDate)}</span>}
          </CardTitle>
          {setting.isActive && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3 w-3" /> Aktif sekarang
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 text-xs">
          <SalRow label="Gaji Pokok"         value={formatCurrency(setting.baseSalary)} highlight />
          <SalRow label="Uang Makan/Hari"    value={formatCurrency(setting.mealAllowancePerDay)} />
          <SalRow label="Tunjangan"          value={formatCurrency(setting.tunjangan ?? "0")} />
          <SalRow label="Transport"          value={formatCurrency(setting.transportAllowance)} />
          <SalRow label="Lembur/Jam"         value={formatCurrency(setting.overtimeRatePerHour)} />
          <SalRow label="Potongan Absen"     value={formatCurrency(setting.absentDeductionPerDay)} />
          <SalRow label="Terlambat 1–30 mnt" value={formatCurrency(setting.lateDeductionBracket1 ?? 25000)} />
          <SalRow label="Terlambat 31–60 mnt"value={formatCurrency(setting.lateDeductionBracket2 ?? 50000)} />
          <SalRow label="Terlambat 61+ mnt"  value={formatCurrency(setting.lateDeductionBracket3 ?? 75000)} />
          <SalRow label="Pulang Cepat/mnt"   value={`${formatCurrency(setting.earlyLeaveDeductionPerMinute)}/mnt`} />
          <SalRow label="JHT Kar/Per"        value={`${setting.bpjsJhtPercent}% / ${setting.bpjsJhtEmployerPercent ?? 3.7}%`} />
          <SalRow label="JP Kar/Per"         value={`${setting.bpjsJpPercent}% / ${setting.bpjsJpEmployerPercent ?? 2}%`} />
        </div>
        {setting.notes && (
          <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
            {setting.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SalRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-medium ${highlight ? "text-foreground" : ""}`}>{value}</span>
    </div>
  );
}

function ChangePasswordCard({
  isPending,
  onSubmit,
}: {
  isPending: boolean;
  onSubmit: (current: string, next: string) => void;
}) {
  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 6) { setError("Password baru minimal 6 karakter"); return; }
    if (next !== confirm)  { setError("Konfirmasi password tidak cocok"); return; }
    onSubmit(current, next);
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Lock className="h-4 w-4" />
          Ganti Password
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Password Lama</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Password Baru</Label>
            <div className="relative">
              <Input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Min. 6 karakter"
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNext ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Konfirmasi Password Baru</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi password baru"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <Button type="submit" size="sm" disabled={isPending || !current || !next || !confirm}>
            {isPending ? "Menyimpan…" : "Simpan Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
