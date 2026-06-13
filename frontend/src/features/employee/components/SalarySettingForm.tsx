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

export function SalarySettingForm({ open, onOpenChange, onSubmit, isPending, error, defaultValues }: Props) {
  const isEdit = !!defaultValues;
  const form = useForm<SalarySettingFormValues>({
    resolver: zodResolver(salarySettingSchema),
    defaultValues: defaultValues ? settingToForm(defaultValues) : {
      baseSalary: 0, mealAllowancePerDay: 0, transportAllowance: 0,
      overtimeRatePerHour: 0, holidayOvertimeRate: 0,
      lateDeductionPerMinute: 0, absentDeductionPerDay: 0, earlyLeaveDeductionPerMinute: 0,
      bpjsJhtPercent: 2, bpjsJpPercent: 1,
      effectiveDate: "", isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues ? settingToForm(defaultValues) : {
        baseSalary: 0, mealAllowancePerDay: 0, transportAllowance: 0,
        overtimeRatePerHour: 0, holidayOvertimeRate: 0,
        lateDeductionPerMinute: 0, absentDeductionPerDay: 0, earlyLeaveDeductionPerMinute: 0,
        bpjsJhtPercent: 2, bpjsJpPercent: 1,
        effectiveDate: "", isActive: true,
      });
    }
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

          {/* Income section */}
          <Section title="Pendapatan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gaji Pokok *" error={errors.baseSalary?.message}>
                <Input {...register("baseSalary")} type="number" min="0" />
              </Field>
              <Field label="Uang Makan / Hari" error={errors.mealAllowancePerDay?.message}>
                <Input {...register("mealAllowancePerDay")} type="number" min="0" />
              </Field>
              <Field label="Tunjangan Transport" error={errors.transportAllowance?.message}>
                <Input {...register("transportAllowance")} type="number" min="0" />
              </Field>
              <Field label="Lembur / Jam" error={errors.overtimeRatePerHour?.message}>
                <Input {...register("overtimeRatePerHour")} type="number" min="0" />
              </Field>
              <Field label="Lembur Hari Libur / Jam" error={errors.holidayOvertimeRate?.message}>
                <Input {...register("holidayOvertimeRate")} type="number" min="0" />
              </Field>
            </div>
          </Section>

          {/* Deduction section */}
          <Section title="Potongan">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Potongan Absen / Hari" error={errors.absentDeductionPerDay?.message}>
                <Input {...register("absentDeductionPerDay")} type="number" min="0" />
              </Field>
              <Field label="Potongan Terlambat / Menit" error={errors.lateDeductionPerMinute?.message}>
                <Input {...register("lateDeductionPerMinute")} type="number" min="0" />
              </Field>
              <Field label="Potongan Pulang Cepat / Menit" error={errors.earlyLeaveDeductionPerMinute?.message}>
                <Input {...register("earlyLeaveDeductionPerMinute")} type="number" min="0" />
              </Field>
            </div>
          </Section>

          {/* BPJS section */}
          <Section title="BPJS (%)">
            <div className="grid grid-cols-2 gap-4">
              <Field label="BPJS JHT %" error={errors.bpjsJhtPercent?.message}>
                <Input {...register("bpjsJhtPercent")} type="number" min="0" max="100" step="0.01" />
              </Field>
              <Field label="BPJS JP %" error={errors.bpjsJpPercent?.message}>
                <Input {...register("bpjsJpPercent")} type="number" min="0" max="100" step="0.01" />
              </Field>
            </div>
          </Section>

          {/* Notes + Active */}
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
    <div className="flex flex-col gap-1.5">
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

function settingToForm(s: SalarySetting): SalarySettingFormValues {
  return {
    baseSalary:                   Number(s.baseSalary),
    mealAllowancePerDay:          Number(s.mealAllowancePerDay),
    transportAllowance:           Number(s.transportAllowance),
    overtimeRatePerHour:          Number(s.overtimeRatePerHour),
    holidayOvertimeRate:          Number(s.holidayOvertimeRate),
    lateDeductionPerMinute:       Number(s.lateDeductionPerMinute),
    absentDeductionPerDay:        Number(s.absentDeductionPerDay),
    earlyLeaveDeductionPerMinute: Number(s.earlyLeaveDeductionPerMinute),
    bpjsJhtPercent:               Number(s.bpjsJhtPercent),
    bpjsJpPercent:                Number(s.bpjsJpPercent),
    effectiveDate:                s.effectiveDate.split("T")[0],
    endDate:                      s.endDate ? s.endDate.split("T")[0] : "",
    isActive:                     s.isActive,
    notes:                        s.notes ?? "",
  };
}
