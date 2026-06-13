import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { shiftSchema, type ShiftFormValues } from "../../schemas/shift.schema";
import type { ShiftMaster } from "../../types";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-primary" : "bg-input"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

const COLOR_OPTIONS = [
  { label: "Biru",   value: "#3b82f6" },
  { label: "Hijau",  value: "#22c55e" },
  { label: "Ungu",   value: "#a855f7" },
  { label: "Oranye", value: "#f97316" },
  { label: "Merah",  value: "#ef4444" },
  { label: "Abu",    value: "#6b7280" },
];

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: ShiftFormValues) => Promise<void>;
  isPending:     boolean;
  defaultValues: ShiftMaster | null;
  error:         string | null;
}

export function ShiftForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: Props) {
  const isEdit  = !!defaultValues;
  const isUsed  = defaultValues?.isUsed ?? false;
  const locked  = isEdit && isUsed;

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      code:      "",
      name:      "",
      startTime: "",
      endTime:   "",
      color:     "",
      isWorking: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        form.reset({
          code:      defaultValues.code,
          name:      defaultValues.name,
          startTime: defaultValues.startTime ?? "",
          endTime:   defaultValues.endTime ?? "",
          color:     defaultValues.color ?? "",
          isWorking: defaultValues.isWorking,
          isActive:  defaultValues.isActive,
        });
      } else {
        form.reset({ code: "", name: "", startTime: "", endTime: "", color: "", isWorking: true });
      }
    }
  }, [open, defaultValues, form]);

  const selectedColor = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shift" : "Tambah Shift Baru"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* Lock warning */}
          {locked && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Shift sudah digunakan. Jam kerja tidak bisa diubah untuk menjaga data payroll.
                Buat shift baru jika jam kerja berubah.
              </span>
            </div>
          )}

          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                Kode <span className="text-destructive">*</span>
                {locked && <span className="ml-1 text-xs text-muted-foreground">(terkunci)</span>}
              </Label>
              <Input
                id="code"
                placeholder="e.g. PAGI"
                {...form.register("code")}
                disabled={isEdit}
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nama <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="e.g. Shift Pagi" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">
                Jam Mulai
                {locked && <span className="ml-1 text-xs text-muted-foreground">(terkunci)</span>}
              </Label>
              <Input
                id="startTime"
                placeholder="09:00"
                {...form.register("startTime")}
                disabled={locked}
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime">
                Jam Selesai
                {locked && <span className="ml-1 text-xs text-muted-foreground">(terkunci)</span>}
              </Label>
              <Input
                id="endTime"
                placeholder="17:00"
                {...form.register("endTime")}
                disabled={locked}
              />
              {form.formState.errors.endTime && (
                <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label>Warna (opsional)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => form.setValue("color", selectedColor === c.value ? "" : c.value)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    selectedColor === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              {selectedColor && !COLOR_OPTIONS.find((c) => c.value === selectedColor) && (
                <span
                  className="h-7 w-7 rounded-full border-2 border-foreground"
                  style={{ backgroundColor: selectedColor }}
                />
              )}
            </div>
          </div>

          {/* isWorking toggle */}
          <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${locked ? "border-border opacity-50" : "border-border"}`}>
            <div>
              <p className="text-sm font-medium">
                Shift Kerja
                {locked && <span className="ml-1 text-xs text-muted-foreground">(terkunci)</span>}
              </p>
              <p className="text-xs text-muted-foreground">Nonaktifkan untuk shift libur / cuti</p>
            </div>
            <Toggle
              checked={form.watch("isWorking")}
              onChange={(v) => form.setValue("isWorking", v)}
              disabled={locked}
            />
          </div>

          {/* isActive toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">Nonaktifkan agar tidak muncul di roster</p>
              </div>
              <Toggle
                checked={form.watch("isActive") ?? defaultValues?.isActive ?? true}
                onChange={(v) => form.setValue("isActive", v)}
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
