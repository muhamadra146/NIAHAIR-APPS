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

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<ChangeStatusFormValues>({
      resolver: zodResolver(changeStatusSchema),
      defaultValues: { status: allowed[0], notes: "" },
    });

  useEffect(() => {
    if (open) reset({ status: allowed[0], notes: "" });
  }, [open, currentStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (allowed.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <AppointmentStatusBadge status={currentStatus} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-status">New Status <span className="text-destructive">*</span></Label>
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-notes">Notes</Label>
            <textarea
              id="status-notes"
              {...register("notes")}
              rows={2}
              placeholder="Optional reason or note..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating…" : "Update Status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
