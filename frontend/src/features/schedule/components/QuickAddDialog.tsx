import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import type { Shift, RosterEmployee, ScheduleStatus } from "../types";

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  date:         string | null;
  employees:    RosterEmployee[];
  shifts:       Shift[];
  isPending:    boolean;
  onSave:       (employeeId: string, shiftId: string | null, status: ScheduleStatus) => void;
}

const SHIFT_COLOR: Record<string, string> = {
  blue:  "bg-blue-100  border-blue-200  text-blue-800",
  green: "bg-green-100 border-green-200 text-green-800",
  gray:  "bg-gray-100  border-gray-200  text-gray-600",
};

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

export function QuickAddDialog({
  open, onOpenChange, date, employees, shifts, isPending, onSave,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>("");

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) setSelectedId(employees[0]?.id ?? "");
  }, [open, employees]);

  if (!date) return null;

  const workingShifts = shifts.filter((s) => s.isWorking && s.isActive);

  function save(shiftId: string | null, status: ScheduleStatus) {
    if (!selectedId) return;
    onSave(selectedId, shiftId, status);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Add Schedule</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDateLabel(date)}</p>
        </DialogHeader>

        {employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            All employees already have a schedule for this date.
          </p>
        ) : (
          <div className="space-y-4 py-1">
            {/* Employee selector */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-employee">Employee</Label>
              <select
                id="qa-employee"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift options */}
            <div className="space-y-2">
              <Label>Shift</Label>

              {workingShifts.map((shift) => {
                const cls = shift.color
                  ? (SHIFT_COLOR[shift.color] ?? SHIFT_COLOR.blue)
                  : SHIFT_COLOR.blue;
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => save(shift.id, "WORKING")}
                    disabled={isPending || !selectedId}
                    className={`w-full rounded-lg border-2 px-4 py-3 text-left transition-all hover:opacity-80 disabled:opacity-40 ${cls}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{shift.code}</span>
                      <span className="text-xs font-medium">
                        {shift.startTime} – {shift.endTime}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs opacity-70">{shift.name}</p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => save(null, "OFF")}
                disabled={isPending || !selectedId}
                className="w-full rounded-lg border-2 border-gray-200 bg-gray-100 px-4 py-3 text-left text-gray-500 transition-all hover:opacity-80 disabled:opacity-40"
              >
                <span className="font-semibold">OFF</span>
                <p className="mt-0.5 text-xs opacity-70">Day off</p>
              </button>

              <button
                type="button"
                onClick={() => save(null, "LEAVE")}
                disabled={isPending || !selectedId}
                className="w-full rounded-lg border-2 border-yellow-200 bg-yellow-50 px-4 py-3 text-left text-yellow-800 transition-all hover:opacity-80 disabled:opacity-40"
              >
                <span className="font-semibold">LEAVE</span>
                <p className="mt-0.5 text-xs opacity-70">Leave / cuti</p>
              </button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
