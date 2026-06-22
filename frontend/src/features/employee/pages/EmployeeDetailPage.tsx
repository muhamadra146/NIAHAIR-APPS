import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, Plus, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useEmployee,
  useUpdateEmployee,
  useUpdateEmployeeBranches,
  useSalarySettings,
  useCreateSalarySetting,
  useUpdateSalarySetting,
} from "../hooks";
import { EmployeeUpdateForm } from "../components/EmployeeForm";
import { SalarySettingForm } from "../components/SalarySettingForm";
import type { UpdateEmployeeFormValues, SalarySettingFormValues } from "../schemas/employee.schema";
import type { SalarySetting } from "../types";

function apiErr(err: unknown, fallback = "Terjadi kesalahan"): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading, isError } = useEmployee(id!);
  const updateMutation       = useUpdateEmployee(id!);
  const updateBranchMutation = useUpdateEmployeeBranches(id!);
  const { data: salarySettings = [], isLoading: salaryLoading } = useSalarySettings(id!);

  const [editOpen, setEditOpen]       = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);
  const [ssOpen, setSsOpen]           = useState(false);
  const [ssError, setSsError]         = useState<string | null>(null);
  const [editSs, setEditSs]           = useState<SalarySetting | null>(null);

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
        resignDate:        values.resignDate        || undefined,
        commissionEnabled: values.commissionEnabled,
        payDay:            values.payDay ?? null,
        isActive:          values.isActive,
        homeBranchId:      values.homeBranchId     || null,
        ktpFile:           files.ktpFile           ?? undefined,
        contractFile:      files.contractFile      ?? undefined,
      });
      await updateBranchMutation.mutateAsync({ branchIds: values.branchIds ?? [] });
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
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !employee) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Karyawan tidak ditemukan.{" "}
          <Link to="/employees" className="text-primary underline">Kembali ke daftar</Link>
        </div>
      </PageContainer>
    );
  }

  const activeSetting = salarySettings.find((s) => s.isActive) ?? null;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/employees"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{employee.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs">{employee.employeeCode}</span>
                <Badge variant="outline" className="text-xs">{employee.role.name}</Badge>
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setEditError(null); setEditOpen(true); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="salary">
              Setting Gaji{salarySettings.length > 0 && ` (${salarySettings.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Info tab */}
          <TabsContent value="info">
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Row label="Kode"            value={employee.employeeCode} />
                <Row label="Nama"            value={employee.name} />
                <Row label="Role"            value={employee.role.name} />
                <Row label="No. HP"          value={employee.phone} />
                <Row label="Email"           value={employee.email} />
                <Row label="NIK KTP"         value={employee.nikKtp} />
                <Row label="Tanggal Masuk"   value={employee.hireDate ? formatDate(employee.hireDate) : null} />
                <Row label="Tanggal Lahir"   value={employee.birthDate ? formatDate(employee.birthDate) : null} />
                <Row label="Tanggal Resign"  value={employee.resignDate ? formatDate(employee.resignDate) : null} />
                <Row label="Alamat"          value={employee.address} />
                <Row label="Kontak Darurat"  value={employee.emergencyContact} />
                <Row label="Komisi"          value={employee.commissionEnabled ? "Aktif" : "Nonaktif"} />
                <Row label="Tanggal Gajian" value={employee.payDay ? `Tanggal ${employee.payDay}` : null} />
                <Row
                  label="Foto KTP"
                  value={employee.ktpFileUrl
                    ? <a href={employee.ktpFileUrl} target="_blank" rel="noreferrer" className="text-primary underline">Lihat File</a>
                    : null}
                />
                <Row
                  label="File Kontrak"
                  value={employee.contractFileUrl
                    ? <a href={employee.contractFileUrl} target="_blank" rel="noreferrer" className="text-primary underline">Lihat File</a>
                    : null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary settings tab */}
          <TabsContent value="salary">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {activeSetting ? "Setting aktif ditemukan" : "Belum ada setting gaji aktif"}
                </p>
                <Button size="sm" onClick={() => { setEditSs(null); setSsError(null); setSsOpen(true); }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Tambah Setting
                </Button>
              </div>

              {salaryLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : salarySettings.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada setting gaji.
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
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function SalarySettingCard({ setting, onEdit }: { setting: SalarySetting; onEdit: () => void }) {
  return (
    <Card className={setting.isActive ? "border-primary/40 bg-primary/5" : ""}>
      <CardHeader className="flex-row items-start justify-between pb-2 pt-4">
        <div>
          <CardTitle className="text-sm font-medium">
            Berlaku: {formatDate(setting.effectiveDate)}
            {setting.endDate && ` – ${formatDate(setting.endDate)}`}
          </CardTitle>
          {setting.isActive && (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
              <Check className="h-3 w-3" /> Aktif
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 text-xs">
          <SalRow label="Gaji Pokok"        value={formatCurrency(setting.baseSalary)} />
          <SalRow label="Uang Makan/Hari"   value={formatCurrency(setting.mealAllowancePerDay)} />
          <SalRow label="Tunjangan"         value={formatCurrency(setting.tunjangan ?? "0")} />
          <SalRow label="Transport"         value={formatCurrency(setting.transportAllowance)} />
          <SalRow label="Lembur/Jam"          value={formatCurrency(setting.overtimeRatePerHour)} />
          <SalRow label="Potongan Absen"      value={formatCurrency(setting.absentDeductionPerDay)} />
          <SalRow label="Terlambat 1–30 mnt"  value={formatCurrency(setting.lateDeductionBracket1 ?? 25000)} />
          <SalRow label="Terlambat 31–60 mnt" value={formatCurrency(setting.lateDeductionBracket2 ?? 50000)} />
          <SalRow label="Terlambat 61+ mnt"   value={formatCurrency(setting.lateDeductionBracket3 ?? 75000)} />
          <SalRow label="Pot. Pulang Cepat"   value={`${formatCurrency(setting.earlyLeaveDeductionPerMinute)}/mnt`} />
          <SalRow label="JHT Kar/Per"         value={`${setting.bpjsJhtPercent}% / ${setting.bpjsJhtEmployerPercent ?? 3.7}%`} />
          <SalRow label="JP Kar/Per"          value={`${setting.bpjsJpPercent}% / ${setting.bpjsJpEmployerPercent ?? 2}%`} />
        </div>
        {setting.notes && (
          <p className="mt-2 text-xs text-muted-foreground italic">{setting.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SalRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
