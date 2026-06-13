import React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Shift, ScheduleCell, RosterEmployee, ScheduleStatus } from "../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  employee:      RosterEmployee | null;
  date:          string | null;
  cell:          ScheduleCell | null;
  shifts:        Shift[];
  isPending:     boolean;
  onSave:        (shiftId: string | null, status: ScheduleStatus | null) => void;
}

function shiftColorStyle(hex: string | null): React.CSSProperties {
  if (!hex) return { backgroundColor: "#dbeafe", borderColor: "#93c5fd", color: "#1e40af" };
  return {
    backgroundColor: `${hex}22`,
    borderColor:     `${hex}88`,
    color:           hex,
  };
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function ShiftCellDialog({
  open, onOpenChange, employee, date, cell, shifts, isPending, onSave,
}: Props) {
  if (!employee || !date) return null;

  const workingShifts = shifts.filter((s) => s.isWorking && s.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {employee.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDateHeader(date)}</p>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {/* Working shifts */}
          {workingShifts.map((shift) => {
            const isSelected = cell?.shift?.id === shift.id && cell?.status === "WORKING";
            return (
              <button
                key={shift.id}
                type="button"
                onClick={() => onSave(shift.id, "WORKING")}
                disabled={isPending}
                style={shiftColorStyle(shift.color)}
                className={[
                  "w-full rounded-lg border-2 px-4 py-3 text-left transition-all",
                  isSelected ? "ring-2 ring-offset-1 ring-primary" : "hover:opacity-80",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{shift.code}</span>
                  <span className="text-xs font-medium">
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>
                <p className="mt-0.5 text-xs opacity-75">{shift.name}</p>
              </button>
            );
          })}

          {/* OFF */}
          <button
            type="button"
            onClick={() => onSave(null, "OFF")}
            disabled={isPending}
            className={[
              "w-full rounded-lg border-2 px-4 py-3 text-left transition-all",
              "bg-gray-100 border-gray-200 text-gray-500",
              cell?.status === "OFF" ? "ring-2 ring-offset-1 ring-primary" : "hover:opacity-80",
            ].join(" ")}
          >
            <span className="font-semibold">OFF</span>
            <p className="mt-0.5 text-xs opacity-75">Hari libur</p>
          </button>

          {/* LEAVE */}
          <button
            type="button"
            onClick={() => onSave(null, "LEAVE")}
            disabled={isPending}
            className={[
              "w-full rounded-lg border-2 px-4 py-3 text-left transition-all",
              "bg-yellow-50 border-yellow-200 text-yellow-700",
              cell?.status === "LEAVE" ? "ring-2 ring-offset-1 ring-primary" : "hover:opacity-80",
            ].join(" ")}
          >
            <span className="font-semibold">LEAVE</span>
            <p className="mt-0.5 text-xs opacity-75">Cuti / izin</p>
          </button>

          {/* Hard delete — only if there's an existing schedule */}
          {cell?.scheduleId && (
            <button
              type="button"
              onClick={() => onSave(null, null)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Jadwal
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
