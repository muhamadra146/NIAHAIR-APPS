import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Paperclip, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchAllBranches } from "@/features/settings/api/branch.api";
import { useDivisions } from "@/features/division/hooks";
import { useAuthStore } from "@/stores/authStore";
import { isFullAccess } from "@/lib/access";
import { useEmployeeRoles, useNextEmployeeCode } from "../hooks";
import { toWibDateStr } from "@/lib/utils";
import { canEditBranchAccess, fileTooLarge, MAX_FILE_MB } from "../employeeInput";
import { createEmployeeSchema, updateEmployeeSchema } from "../schemas/employee.schema";
import type { CreateEmployeeFormValues, UpdateEmployeeFormValues, UpdateEmployeeFormInput } from "../schemas/employee.schema";
import type { Employee } from "../types";

// ── Create ────────────────────────────────────────────────────────────────────

export type EmployeeFiles = { ktpFile?: File | null; contractFile?: File | null };

interface CreateProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:     (v: CreateEmployeeFormValues, files: EmployeeFiles) => Promise<void>;
  isPending:    boolean;
  error:        string | null;
}

export function EmployeeCreateForm({ open, onOpenChange, onSubmit, isPending, error }: CreateProps) {
  const { data: roles = [] }  = useEmployeeRoles();
  const { data: nextCode }    = useNextEmployeeCode();
  const { data: branches = [] } = useQuery({ queryKey: ["branches-all"], queryFn: fetchAllBranches });
  const [ktpFile,      setKtpFile]      = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  const form = useForm<UpdateEmployeeFormInput, unknown, CreateEmployeeFormValues>({
    resolver: zodResolver<UpdateEmployeeFormInput, unknown, CreateEmployeeFormValues>(createEmployeeSchema),
    defaultValues: {
      name: "", roleId: "", employeeCode: "", phone: "", email: "",
      hireDate: "", birthDate: "", address: "", emergencyContact: "",
      nikKtp: "", resignDate: "",
      commissionEnabled: false, payDay: null, homeBranchId: "", branchIds: [],
      divisionId: "", isDivisionManager: false,
    },
  });

  useEffect(() => {
    if (!open) { form.reset(); setKtpFile(null); setContractFile(null); }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 top-0 translate-y-0 rounded-none h-[100dvh] max-w-full sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Tambah Karyawan</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => onSubmit(v, { ktpFile, contractFile }))}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <EmployeeFormFields
              form={form} roles={roles} branches={branches} nextCode={nextCode} isEdit={false}
              ktpFile={ktpFile} setKtpFile={setKtpFile}
              contractFile={contractFile} setContractFile={setContractFile}
            />
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Update ────────────────────────────────────────────────────────────────────

interface UpdateProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:     (v: UpdateEmployeeFormValues, files: EmployeeFiles) => Promise<void>;
  isPending:    boolean;
  error:        string | null;
  employee:     Employee;
}

export function EmployeeUpdateForm({ open, onOpenChange, onSubmit, isPending, error, employee }: UpdateProps) {
  const { data: roles = [] }    = useEmployeeRoles();
  const { data: branches = [] } = useQuery({ queryKey: ["branches-all"], queryFn: fetchAllBranches });
  const [ktpFile,      setKtpFile]      = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  const canSetActive = isFullAccess(useAuthStore((s) => s.user));

  const form = useForm<UpdateEmployeeFormInput, unknown, UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: employeeToForm(employee),
  });

  useEffect(() => {
    if (open) { form.reset(employeeToForm(employee)); setKtpFile(null); setContractFile(null); }
  }, [open, employee, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 top-0 translate-y-0 rounded-none h-[100dvh] max-w-full sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Edit Karyawan</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => onSubmit(v, { ktpFile, contractFile }))}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <EmployeeFormFields
              form={form} roles={roles} branches={branches} isEdit={true}
              ktpFile={ktpFile} setKtpFile={setKtpFile}
              contractFile={contractFile} setContractFile={setContractFile}
              existingKtpUrl={employee.ktpFileUrl}
              existingContractUrl={employee.contractFileUrl}
            />
            {/* Status aktif hanya diubah Owner / Super Admin (backend menolak peran lain) */}
            {canSetActive && (
              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive") ?? true}
                  onCheckedChange={(v) => form.setValue("isActive", v)}
                />
                <Label htmlFor="isActive">Aktif</Label>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-4 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared form fields ────────────────────────────────────────────────────────

import type { UseFormReturn } from "react-hook-form";
import type { EmployeeRole } from "../types";

interface Branch { id: string; code: string; name: string; }

function EmployeeFormFields({
  form,
  roles,
  branches,
  nextCode,
  isEdit,
  ktpFile,
  setKtpFile,
  contractFile,
  setContractFile,
  existingKtpUrl,
  existingContractUrl,
}: {
  form:      UseFormReturn<UpdateEmployeeFormInput, unknown, CreateEmployeeFormValues | UpdateEmployeeFormValues>;
  roles:     EmployeeRole[];
  branches:  Branch[];
  nextCode?: string;
  isEdit:    boolean;
  ktpFile:          File | null;
  setKtpFile:       (f: File | null) => void;
  contractFile:     File | null;
  setContractFile:  (f: File | null) => void;
  existingKtpUrl?:      string | null;
  existingContractUrl?: string | null;
}) {
  const { register, formState: { errors }, watch, setValue } = form;
  const [openBranch, setOpenBranch] = useState(false);
  // Divisi & manager divisi hanya diatur Owner / Super Admin
  const canSetDivision = isFullAccess(useAuthStore((s) => s.user));
  const { data: divisions = [] } = useDivisions();
  const divisionId = (watch("divisionId") as string | undefined) ?? "";
  const ktpInputRef      = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  // Akses cabang diubah Super Admin & Owner (PATCH /employees/:id/branches) — B12, EMP-005
  const canEditBranches = canEditBranchAccess(useAuthStore((s) => s.user?.roleCode));
  const [fileErrors, setFileErrors] = useState<{ ktp?: string | null; contract?: string | null }>({});

  /** Pilih file: tolak > 10 MB di browser agar pesan jelas (batas backend sama) */
  function pickFile(key: "ktp" | "contract", input: HTMLInputElement, set: (f: File | null) => void) {
    const file = input.files?.[0] ?? null;
    if (fileTooLarge(file)) {
      setFileErrors((e) => ({ ...e, [key]: `Ukuran file maksimal ${MAX_FILE_MB} MB` }));
      set(null);
      input.value = "";
      return;
    }
    setFileErrors((e) => ({ ...e, [key]: null }));
    set(file);
  }

  const selectedBranchIds = (watch("branchIds") as string[]) ?? [];
  const homeBranchId      = watch("homeBranchId") ?? "";

  const homeBranchNotInAccess =
    canEditBranches &&
    homeBranchId !== "" &&
    selectedBranchIds.length > 0 &&
    !selectedBranchIds.includes(homeBranchId);

  function toggleBranch(id: string) {
    const next = selectedBranchIds.includes(id)
      ? selectedBranchIds.filter((x) => x !== id)
      : [...selectedBranchIds, id];
    setValue("branchIds", next);
  }

  const errs = errors as Record<string, { message?: string }>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

      {/* Nama */}
      <Field label="Nama *" error={errs.name?.message} full>
        <Input {...register("name")} placeholder="Nama lengkap" />
      </Field>

      {/* Role */}
      <Field label="Role *" error={errs.roleId?.message}>
        <select
          {...register("roleId")}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pilih role</option>
          {roles.filter((r) => r.isActive).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </Field>

      {/* Kode Karyawan — tidak dapat diubah setelah dibuat (EMP-001) */}
      <Field label="Kode Karyawan" error={errs.employeeCode?.message}>
        {isEdit ? (
          <Input value={(watch("employeeCode") as string) ?? ""} readOnly disabled className="text-muted-foreground" />
        ) : (
          <Input value={nextCode ?? "…"} disabled className="text-muted-foreground" />
        )}
      </Field>

      {/* No. HP */}
      <Field label="No. HP" error={errs.phone?.message}>
        <Input {...register("phone")} placeholder="08xxxxxxxxxx" inputMode="tel" maxLength={20} />
      </Field>

      {/* Email */}
      <Field label="Email" error={errs.email?.message} full>
        <Input {...register("email")} type="email" placeholder="email@contoh.com" maxLength={100} />
        <p className="mt-1 text-xs text-muted-foreground">Satu email per orang: bila karyawan punya akun, email login ikut berubah (dipakai untuk login, notifikasi, dan reset password).</p>
      </Field>

      {/* Tanggal Masuk */}
      <Field label="Tanggal Masuk" error={errs.hireDate?.message}>
        <Input {...register("hireDate")} type="date" />
      </Field>

      {/* Tanggal Lahir */}
      <Field label="Tanggal Lahir" error={errs.birthDate?.message}>
        <Input {...register("birthDate")} type="date" max={toWibDateStr()} />
      </Field>

      {/* Kontak Darurat */}
      <Field label="Kontak Darurat" error={errs.emergencyContact?.message} full>
        <Input {...register("emergencyContact")} placeholder="Nama - No. HP" maxLength={150} />
      </Field>

      {/* Alamat */}
      <Field label="Alamat" error={errs.address?.message} full>
        <textarea
          {...register("address")}
          rows={2}
          maxLength={500}
          placeholder="Alamat lengkap"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>

      {/* NIK KTP */}
      <Field label="NIK KTP" error={errs.nikKtp?.message}>
        <Input {...register("nikKtp")} placeholder="16 digit NIK" inputMode="numeric" maxLength={16} />
      </Field>

      {/* Tanggal Resign */}
      <Field label="Tanggal Resign" error={errs.resignDate?.message}>
        <Input {...register("resignDate")} type="date" />
      </Field>

      {/* Upload Foto KTP */}
      <Field label="Foto KTP" full error={fileErrors.ktp ?? undefined}>
        <input
          ref={ktpInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={(e) => pickFile("ktp", e.target, setKtpFile)}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ktpInputRef.current?.click()}
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {ktpFile ? "Ganti File" : existingKtpUrl ? "Ganti File" : "Pilih File"}
          </Button>
          {ktpFile ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="truncate max-w-[160px]">{ktpFile.name}</span>
              <button type="button" onClick={() => { setKtpFile(null); if (ktpInputRef.current) ktpInputRef.current.value = ""; }}>
                <X className="h-3.5 w-3.5 hover:text-destructive" />
              </button>
            </div>
          ) : existingKtpUrl ? (
            <a href={existingKtpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
              Lihat file saat ini
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Belum ada file (JPG/PNG/WEBP/HEIC/PDF, maks. 10 MB)</span>
          )}
        </div>
      </Field>

      {/* Upload File Kontrak */}
      <Field label="File Kontrak" full error={fileErrors.contract ?? undefined}>
        <input
          ref={contractInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={(e) => pickFile("contract", e.target, setContractFile)}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => contractInputRef.current?.click()}
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {contractFile ? "Ganti File" : existingContractUrl ? "Ganti File" : "Pilih File"}
          </Button>
          {contractFile ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="truncate max-w-[160px]">{contractFile.name}</span>
              <button type="button" onClick={() => { setContractFile(null); if (contractInputRef.current) contractInputRef.current.value = ""; }}>
                <X className="h-3.5 w-3.5 hover:text-destructive" />
              </button>
            </div>
          ) : existingContractUrl ? (
            <a href={existingContractUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
              Lihat file saat ini
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Belum ada file (JPG/PNG/WEBP/HEIC/PDF, maks. 10 MB)</span>
          )}
        </div>
      </Field>

      {/* Divisi */}
      {canSetDivision && (
        <Field label="Divisi" full>
          {/* Dikendalikan nilai form: daftar divisi dimuat async setelah form diisi */}
          <select
            value={divisionId}
            onChange={(e) => {
              setValue("divisionId", e.target.value, { shouldDirty: true });
              if (!e.target.value) setValue("isDivisionManager", false);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Tanpa divisi —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <Switch
              checked={(watch("isDivisionManager") as boolean) ?? false}
              onCheckedChange={(v) => setValue("isDivisionManager", v)}
              disabled={!divisionId}
            />
            Manager Divisi
          </label>
          <p className="text-xs text-muted-foreground">
            Manager divisi mengatur jadwal &amp; menyetujui pengajuan staf divisinya di cabang utamanya.
            Pengajuan manager disetujui Owner / Super Admin.
          </p>
        </Field>
      )}

      {/* Home Branch */}
      {branches.length > 0 && (
        <Field label="Cabang Utama" error={errs.homeBranchId?.message} full>
          <select
            {...register("homeBranchId")}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Pilih cabang —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Cabang utama untuk penggajian, absensi, dan laporan. Otomatis termasuk cabang tempat karyawan bisa bekerja.</p>
          {homeBranchNotInAccess && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Cabang utama belum ada di daftar "Bisa Bekerja Di". Tambahkan di bawah.</span>
            </div>
          )}
        </Field>
      )}

      {/* Can Work At — hanya Super Admin (B12) */}
      {branches.length > 0 && canEditBranches && (
        <Field label="Bisa Bekerja Di" full>
          <div className="rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenBranch((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/40 transition-colors"
            >
              <span className="text-muted-foreground">
                {selectedBranchIds.length === 0
                  ? "Pilih cabang…"
                  : `${selectedBranchIds.length} cabang dipilih`}
              </span>
              <span className="text-xs text-muted-foreground">{openBranch ? "▲" : "▼"}</span>
            </button>
            {openBranch && (
              <div className="border-t border-input divide-y divide-input">
                {branches.map((b) => {
                  const checked = selectedBranchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBranch(b.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span>{b.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{b.code}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </Field>
      )}

      {/* Tanggal Gajian */}
      <Field label="Tanggal Gajian (1-31)" error={errs.payDay?.message}>
        <Input
          {...register("payDay", {
            // Kosong = null (B13). RHF juga memanggil setValueAs dengan nilai awal null —
            // Number(null) = 0 akan memicu "harus antara 1 dan 31"
            setValueAs: (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v)),
          })}
          type="number"
          min={1}
          max={31}
          placeholder="Cth: 7"
        />
      </Field>

      {/* Aktifkan Komisi */}
      <div className="sm:col-span-2 flex items-center gap-3">
        <Switch
          id="commissionEnabled"
          checked={(watch("commissionEnabled") as boolean) ?? false}
          onCheckedChange={(v) => setValue("commissionEnabled", v)}
        />
        <Label htmlFor="commissionEnabled">Aktifkan Komisi</Label>
      </div>
    </div>
  );
}

function Field({
  label, error, children, full,
}: {
  label: string; error?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function employeeToForm(e: Employee): UpdateEmployeeFormValues {
  return {
    name:              e.name,
    roleId:            e.roleId,
    employeeCode:      e.employeeCode ?? "",
    phone:             e.phone ?? "",
    email:             e.email ?? "",
    hireDate:          e.hireDate   ? e.hireDate.split("T")[0]   : "",
    birthDate:         e.birthDate  ? e.birthDate.split("T")[0]  : "",
    address:           e.address ?? "",
    emergencyContact:  e.emergencyContact ?? "",
    nikKtp:            e.nikKtp ?? "",
    resignDate:        e.resignDate ? e.resignDate.split("T")[0] : "",
    commissionEnabled: e.commissionEnabled,
    payDay:            e.payDay ?? null,
    isActive:          e.isActive,
    homeBranchId:      e.homeBranchId ?? "",
    branchIds:         e.employeeBranches?.map((eb) => eb.branch.id) ?? [],
    divisionId:        e.divisionId ?? "",
    isDivisionManager: e.isDivisionManager ?? false,
  };
}
