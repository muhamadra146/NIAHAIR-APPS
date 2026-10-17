import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { changeStatusSchema, type ChangeStatusFormValues } from "../schemas/appointment.schema";
import { AppointmentStatusBadge, STATUS_LABEL } from "./AppointmentStatusBadge";
import type { AppointmentStatus } from "../types";

// Sama dengan VALID_TRANSITIONS di backend (appointment.service.js).
// Reschedule bukan status — jadwal ulang lewat tombol Reschedule di Booking Harian.
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED:      ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED:   ["CHECK_IN",  "CANCELLED", "NO_SHOW"],
  CHECK_IN:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  currentStatus: AppointmentStatus;
  onSubmit:      (values: ChangeStatusFormValues) => void;
  isPending:     boolean;
  error?:        string | null;
}

export function AppointmentStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSubmit,
  isPending,
  error,
}: Props) {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

  const { register, handleSubmit, reset, watch, formState: { errors } } =
    useForm<ChangeStatusFormValues>({
      resolver: zodResolver(changeStatusSchema),
      defaultValues: { status: allowed[0], notes: "", cancelReason: "" },
    });

  useEffect(() => {
    if (open) reset({ status: allowed[0], notes: "", cancelReason: "" });
  }, [open, currentStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = watch("status");

  if (allowed.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Status Booking</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status saat ini:</span>
            <AppointmentStatusBadge status={currentStatus} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-status">Status Baru <span className="text-destructive">*</span></Label>
            <select
              id="new-status"
              {...register("status")}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                errors.status && "border-destructive"
              )}
            >
              {allowed.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
            {selected === "NO_SHOW" && (
              <p className="text-xs text-muted-foreground">
                Pelanggan tidak datang. Booking akan ditutup — untuk memindah jadwal gunakan Reschedule di Booking Harian.
              </p>
            )}
          </div>

          {selected === "CANCELLED" && (
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Alasan pembatalan <span className="text-destructive">*</span></Label>
              <textarea
                id="cancel-reason"
                {...register("cancelReason")}
                rows={2}
                placeholder="Mis. pelanggan berhalangan"
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none",
                  errors.cancelReason && "border-destructive"
                )}
              />
              {errors.cancelReason && <p className="text-xs text-destructive">{errors.cancelReason.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="status-notes">Catatan</Label>
            <textarea
              id="status-notes"
              {...register("notes")}
              rows={2}
              placeholder="Catatan tambahan (opsional)"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Memperbarui…" : "Simpan Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
