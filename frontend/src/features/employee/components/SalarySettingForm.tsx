import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { salarySettingSchema } from "../schemas/employee.schema";
import type { SalarySettingFormValues } from "../schemas/employee.schema";
import type { SalarySetting } from "../types";

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:     (v: SalarySettingFormValues) => Promise<void>;
  isPending:    boolean;
  error:        string | null;
  defaultValues?: SalarySetting | null;
}

const EMPTY_DEFAULTS: SalarySettingFormValues = {
  baseSalary: 0, mealAllowancePerDay: 0, tunjangan: 0, transportAllowance: 0,
  overtimeRatePerHour: 0, holidayRatePerDay: 0,
  lateDeductionBracket1: 25000, lateDeductionBracket2: 50000, lateDeductionBracket3: 75000,
  absentDeductionPerDay: 0, earlyLeaveDeductionPerMinute: 0,
  bpjsJhtPercent: 2, bpjsJhtEmployerPercent: 3.7,
  bpjsJpPercent: 1,  bpjsJpEmployerPercent: 2,
  bpjsKesehatanEmployeePercent: 1, bpjsKesehatanEmployerPercent: 4,
  effectiveDate: "", endDate: "", isActive: true, notes: "",
};

function settingToForm(s: SalarySetting): SalarySettingFormValues {
  return {
    baseSalary:                   Number(s.baseSalary),
    mealAllowancePerDay:          Number(s.mealAllowancePerDay),
    tunjangan:                    Number(s.tunjangan ?? 0),
    transportAllowance:           Number(s.transportAllowance),
    overtimeRatePerHour:          Number(s.overtimeRatePerHour),
    holidayRatePerDay:            Number(s.holidayRatePerDay),
    lateDeductionBracket1:        Number(s.lateDeductionBracket1 ?? 25000),
    lateDeductionBracket2:        Number(s.lateDeductionBracket2 ?? 50000),
    lateDeductionBracket3:        Number(s.lateDeductionBracket3 ?? 75000),
    absentDeductionPerDay:        Number(s.absentDeductionPerDay),
    earlyLeaveDeductionPerMinute: Number(s.earlyLeaveDeductionPerMinute),
    bpjsJhtPercent:               Number(s.bpjsJhtPercent),
    bpjsJhtEmployerPercent:       Number(s.bpjsJhtEmployerPercent ?? 3.7),
    bpjsJpPercent:                Number(s.bpjsJpPercent),
    bpjsJpEmployerPercent:        Number(s.bpjsJpEmployerPercent ?? 2),
    bpjsKesehatanEmployeePercent: Number(s.bpjsKesehatanEmployeePercent ?? 1),
    bpjsKesehatanEmployerPercent: Number(s.bpjsKesehatanEmployerPercent ?? 4),
    effectiveDate:                s.effectiveDate.split("T")[0],
    endDate:                      s.endDate ? s.endDate.split("T")[0] : "",
    isActive:                     s.isActive,
    notes:                        s.notes ?? "",
  };
}

export function SalarySettingForm({ open, onOpenChange, onSubmit, isPending, error, defaultValues }: Props) {
  const isEdit = !!defaultValues;
  const form = useForm<SalarySettingFormValues>({
    resolver: zodResolver(salarySettingSchema),
    defaultValues: defaultValues ? settingToForm(defaultValues) : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues ? settingToForm(defaultValues) : EMPTY_DEFAULTS);
  }, [open, defaultValues, form]);

  const { register, formState: { errors }, watch, setValue } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Setting Gaji" : "Tambah Setting Gaji"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">

          {/* Tanggal berlaku */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tanggal Berlaku *" error={errors.effectiveDate?.message}>
              <Input {...register("effectiveDate")} type="date" />
            </Field>
            <Field label="Tanggal Berakhir" error={errors.endDate?.message}>
              <Input {...register("endDate")} type="date" />
            </Field>
          </div>

          {/* Pendapatan */}
          <Section title="Pendapatan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gaji Pokok *" error={errors.baseSalary?.message}>
                <Input {...register("baseSalary")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Uang Makan / Hari" error={errors.mealAllowancePerDay?.message}>
                <Input {...register("mealAllowancePerDay")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Tunjangan / Bulan" error={errors.tunjangan?.message}>
                <Input {...register("tunjangan")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Transport / Bulan" error={errors.transportAllowance?.message}>
                <Input {...register("transportAllowance")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Lembur / Jam" error={errors.overtimeRatePerHour?.message}>
                <Input {...register("overtimeRatePerHour")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Kerja Hari Libur / Hari" error={errors.holidayRatePerDay?.message}>
                <Input {...register("holidayRatePerDay")} type="number" min="0" step="1000" />
              </Field>
            </div>
          </Section>

          {/* Potongan */}
          <Section title="Potongan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Potongan Absen / Hari" error={errors.absentDeductionPerDay?.message}>
                <Input {...register("absentDeductionPerDay")} type="number" min="0" step="1000" />
              </Field>
              <Field label="Pot. Pulang Cepat / Menit" error={errors.earlyLeaveDeductionPerMinute?.message}>
                <Input {...register("earlyLeaveDeductionPerMinute")} type="number" min="0" />
              </Field>
              <Field label="Pot. Terlambat 1–30 menit" error={errors.lateDeductionBracket1?.message}>
                <Input {...register("lateDeductionBracket1")} type="number" min="0" step="5000" />
              </Field>
              <Field label="Pot. Terlambat 31–60 menit" error={errors.lateDeductionBracket2?.message}>
                <Input {...register("lateDeductionBracket2")} type="number" min="0" step="5000" />
              </Field>
              <Field label="Pot. Terlambat 61+ menit" error={errors.lateDeductionBracket3?.message}>
                <Input {...register("lateDeductionBracket3")} type="number" min="0" step="5000" />
              </Field>
            </div>
          </Section>

          {/* BPJS Ketenagakerjaan */}
          <Section title="BPJS Ketenagakerjaan (%)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="JHT Karyawan %" error={errors.bpjsJhtPercent?.message}>
                <Input {...register("bpjsJhtPercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Dipotong dari gaji (def. 2%)</p>
              </Field>
              <Field label="JHT Perusahaan %" error={errors.bpjsJhtEmployerPercent?.message}>
                <Input {...register("bpjsJhtEmployerPercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Tanggungan perusahaan (def. 3.7%)</p>
              </Field>
              <Field label="JP Karyawan %" error={errors.bpjsJpPercent?.message}>
                <Input {...register("bpjsJpPercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Dipotong dari gaji (def. 1%)</p>
              </Field>
              <Field label="JP Perusahaan %" error={errors.bpjsJpEmployerPercent?.message}>
                <Input {...register("bpjsJpEmployerPercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Tanggungan perusahaan (def. 2%)</p>
              </Field>
            </div>
          </Section>

          {/* BPJS Kesehatan */}
          <Section title="BPJS Kesehatan (%)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kesehatan Karyawan %" error={errors.bpjsKesehatanEmployeePercent?.message}>
                <Input {...register("bpjsKesehatanEmployeePercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Dipotong dari gaji (def. 1%)</p>
              </Field>
              <Field label="Kesehatan Perusahaan %" error={errors.bpjsKesehatanEmployerPercent?.message}>
                <Input {...register("bpjsKesehatanEmployerPercent")} type="number" min="0" max="100" step="0.1" />
                <p className="text-xs text-muted-foreground">Tanggungan perusahaan (def. 4%)</p>
              </Field>
            </div>
          </Section>

          {/* Catatan + aktif */}
          <Field label="Catatan" error={errors.notes?.message}>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              id="ss-isActive"
              checked={watch("isActive") ?? true}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
            <Label htmlFor="ss-isActive">Jadikan setting aktif</Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
