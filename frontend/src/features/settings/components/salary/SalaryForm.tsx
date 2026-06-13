import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import type { SalarySetting, Employee } from "../../types";

const schema = z.object({
  baseSalary:                   z.number({ error: "Wajib diisi" }).min(0),
  mealAllowancePerDay:          z.number().min(0).optional().default(0),
  transportAllowance:           z.number().min(0).optional().default(0),
  overtimeRatePerHour:          z.number().min(0).optional().default(0),
  holidayOvertimeRate:          z.number().min(0).optional().default(0),
  lateDeductionPerMinute:       z.number().min(0).optional().default(0),
  absentDeductionPerDay:        z.number().min(0).optional().default(0),
  earlyLeaveDeductionPerMinute: z.number().min(0).optional().default(0),
  bpjsJhtPercent:               z.number().min(0).max(100).optional().default(2),
  bpjsJpPercent:                z.number().min(0).max(100).optional().default(1),
  effectiveDate:                z.string().min(1, "Tanggal berlaku wajib diisi"),
  notes:                        z.string().optional(),
});

export type SalaryFormValues = z.infer<typeof schema>;

interface Props {
  employee:   Employee;
  editing:    SalarySetting | null;
  isPending:  boolean;
  onSubmit:   (values: SalaryFormValues) => void;
  onCancel:   () => void;
}

const CURRENCY_FIELDS: { key: keyof SalaryFormValues; label: string }[] = [
  { key: "baseSalary",                   label: "Gaji Pokok (Rp)" },
  { key: "mealAllowancePerDay",          label: "Uang Makan / Hari (Rp)" },
  { key: "transportAllowance",           label: "Tunjangan Transport / Bulan (Rp)" },
  { key: "overtimeRatePerHour",          label: "Rate Lembur / Jam (Rp)" },
  { key: "holidayOvertimeRate",          label: "Rate Lembur Hari Libur / Jam (Rp)" },
];

const DEDUCTION_FIELDS: { key: keyof SalaryFormValues; label: string }[] = [
  { key: "lateDeductionPerMinute",       label: "Potongan Terlambat / Menit (Rp)" },
  { key: "absentDeductionPerDay",        label: "Potongan Tidak Hadir / Hari (Rp)" },
  { key: "earlyLeaveDeductionPerMinute", label: "Potongan Pulang Cepat / Menit (Rp)" },
];

const fmt = (v: number) => new Intl.NumberFormat("id-ID").format(v);

export function SalaryForm({ employee, editing, isPending, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SalaryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseSalary:                   0,
      mealAllowancePerDay:          0,
      transportAllowance:           0,
      overtimeRatePerHour:          0,
      holidayOvertimeRate:          0,
      lateDeductionPerMinute:       0,
      absentDeductionPerDay:        0,
      earlyLeaveDeductionPerMinute: 0,
      bpjsJhtPercent:               2,
      bpjsJpPercent:                1,
      effectiveDate:                new Date().toISOString().split("T")[0],
      notes:                        "",
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        baseSalary:                   Number(editing.baseSalary),
        mealAllowancePerDay:          Number(editing.mealAllowancePerDay),
        transportAllowance:           Number(editing.transportAllowance),
        overtimeRatePerHour:          Number(editing.overtimeRatePerHour),
        holidayOvertimeRate:          Number(editing.holidayOvertimeRate),
        lateDeductionPerMinute:       Number(editing.lateDeductionPerMinute),
        absentDeductionPerDay:        Number(editing.absentDeductionPerDay),
        earlyLeaveDeductionPerMinute: Number(editing.earlyLeaveDeductionPerMinute),
        bpjsJhtPercent:               Number(editing.bpjsJhtPercent),
        bpjsJpPercent:                Number(editing.bpjsJpPercent),
        effectiveDate:                editing.effectiveDate.split("T")[0],
        notes:                        editing.notes ?? "",
      });
    }
  }, [editing, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="font-medium">{employee.name}</span>
        <span className="ml-2 text-muted-foreground">· {employee.role.name}</span>
      </div>

      {/* Pendapatan */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendapatan</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CURRENCY_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                {...register(key, { valueAsNumber: true })}
                className="mt-1"
              />
              {errors[key] && <p className="mt-0.5 text-xs text-destructive">{errors[key]?.message as string}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Potongan */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Potongan</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEDUCTION_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                step={100}
                {...register(key, { valueAsNumber: true })}
                className="mt-1"
              />
              {errors[key] && <p className="mt-0.5 text-xs text-destructive">{errors[key]?.message as string}</p>}
            </div>
          ))}

          <div>
            <Label className="text-xs">Iuran JHT (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register("bpjsJhtPercent", { valueAsNumber: true })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Iuran JP (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register("bpjsJpPercent", { valueAsNumber: true })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Tanggal berlaku + catatan */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Berlaku Mulai <span className="text-destructive">*</span></Label>
          <Input type="date" {...register("effectiveDate")} className="mt-1" />
          {errors.effectiveDate && <p className="mt-0.5 text-xs text-destructive">{errors.effectiveDate.message}</p>}
        </div>
        <div>
          <Label className="text-xs">Catatan</Label>
          <Input {...register("notes")} placeholder="Opsional" className="mt-1" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Setting"}
        </Button>
      </div>
    </form>
  );
}

export { fmt };
