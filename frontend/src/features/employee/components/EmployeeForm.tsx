import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEmployeeRoles } from "../hooks";
import { createEmployeeSchema, updateEmployeeSchema } from "../schemas/employee.schema";
import type { CreateEmployeeFormValues, UpdateEmployeeFormValues } from "../schemas/employee.schema";
import type { Employee } from "../types";

// ── Create ────────────────────────────────────────────────────────────────────

interface CreateProps {
  open:        boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:    (v: CreateEmployeeFormValues) => Promise<void>;
  isPending:   boolean;
  error:       string | null;
}

export function EmployeeCreateForm({ open, onOpenChange, onSubmit, isPending, error }: CreateProps) {
  const { data: roles = [] } = useEmployeeRoles();
  const form = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { name: "", roleId: "", commissionEnabled: false },
  });

  useEffect(() => { if (!open) form.reset(); }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <EmployeeFormFields form={form} roles={roles} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
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
  open:        boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:    (v: UpdateEmployeeFormValues) => Promise<void>;
  isPending:   boolean;
  error:       string | null;
  employee:    Employee;
}

export function EmployeeUpdateForm({ open, onOpenChange, onSubmit, isPending, error, employee }: UpdateProps) {
  const { data: roles = [] } = useEmployeeRoles();
  const form = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: employeeToForm(employee),
  });

  useEffect(() => {
    if (open) form.reset(employeeToForm(employee));
  }, [open, employee, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Karyawan</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <EmployeeFormFields form={form} roles={roles} />
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={form.watch("isActive") ?? true}
              onCheckedChange={(v) => form.setValue("isActive", v)}
            />
            <Label htmlFor="isActive">Aktif</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
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

function EmployeeFormFields({
  form,
  roles,
}: {
  form:  UseFormReturn<CreateEmployeeFormValues | UpdateEmployeeFormValues>;
  roles: EmployeeRole[];
}) {
  const { register, formState: { errors }, watch, setValue } = form;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama *" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Nama lengkap" />
        </Field>
        <Field label="Role *" error={(errors as Record<string, { message?: string }>).roleId?.message}>
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
        <Field label="Kode Karyawan" error={(errors as Record<string, { message?: string }>).employeeCode?.message}>
          <Input {...register("employeeCode")} placeholder="Auto jika kosong" />
        </Field>
        <Field label="No. HP" error={(errors as Record<string, { message?: string }>).phone?.message}>
          <Input {...register("phone")} placeholder="08xxxxxxxxxx" />
        </Field>
        <Field label="Email" error={(errors as Record<string, { message?: string }>).email?.message}>
          <Input {...register("email")} type="email" placeholder="email@contoh.com" />
        </Field>
        <Field label="Tanggal Masuk" error={(errors as Record<string, { message?: string }>).hireDate?.message}>
          <Input {...register("hireDate")} type="date" />
        </Field>
        <Field label="Tanggal Lahir" error={(errors as Record<string, { message?: string }>).birthDate?.message}>
          <Input {...register("birthDate")} type="date" />
        </Field>
        <Field label="Kontak Darurat" error={(errors as Record<string, { message?: string }>).emergencyContact?.message}>
          <Input {...register("emergencyContact")} placeholder="Nama - No. HP" />
        </Field>
      </div>
      <Field label="Alamat" error={(errors as Record<string, { message?: string }>).address?.message}>
        <textarea
          {...register("address")}
          rows={2}
          placeholder="Alamat lengkap"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Switch
          id="commissionEnabled"
          checked={watch("commissionEnabled") ?? false}
          onCheckedChange={(v) => setValue("commissionEnabled", v)}
        />
        <Label htmlFor="commissionEnabled">Aktifkan Komisi</Label>
      </div>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
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
    hireDate:          e.hireDate ? e.hireDate.split("T")[0] : "",
    birthDate:         e.birthDate ? e.birthDate.split("T")[0] : "",
    address:           e.address ?? "",
    emergencyContact:  e.emergencyContact ?? "",
    commissionEnabled: e.commissionEnabled,
    isActive:          e.isActive,
    homeBranchId:      e.homeBranchId ?? "",
  };
}
