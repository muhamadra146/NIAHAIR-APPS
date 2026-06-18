import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import type { RosterData, ScheduleCell, RosterEmployee, Shift, ScheduleStatus } from "../types";
import { ShiftCellDialog } from "./ShiftCellDialog";
import { QuickAddDialog }  from "./QuickAddDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-violet-500",
  "bg-rose-400",
  "bg-amber-400",
  "bg-sky-500",
  "bg-teal-400",
];

function avatarColor(name: string): string {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function formatDayHeader(dateStr: string): { day: string; num: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    num: String(d.getDate()),
  };
}

// ── EmployeeAvatar ────────────────────────────────────────────────────────────

function EmployeeAvatar({ name }: { name: string }) {
  return (
    <div
      className={`h-9 w-9 shrink-0 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-sm font-bold select-none`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── ShiftCell ─────────────────────────────────────────────────────────────────

function UnassignBtn({ onUnassign }: { onUnassign: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onUnassign(); }}
      className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-opacity shadow-sm"
      title="Remove schedule"
      aria-label="Remove schedule"
    >
      <X className="h-2.5 w-2.5" />
    </button>
  );
}

function ShiftCell({
  cell,
  onClick,
  onUnassign,
}: {
  cell:       ScheduleCell | null;
  onClick:    () => void;
  onUnassign: () => void;
}) {
  // Empty — no x button
  if (!cell?.status) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full min-h-[68px] rounded-xl border border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        aria-label="Add schedule"
      />
    );
  }

  // OFF — hatched pattern
  if (cell.status === "OFF") {
    return (
      <div className="relative group">
        <UnassignBtn onUnassign={onUnassign} />
        <button
          type="button"
          onClick={onClick}
          className="w-full min-h-[68px] rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer"
          style={{
            background:
              "repeating-linear-gradient(-45deg,#e5e7eb,#e5e7eb 1px,#f9fafb 1px,#f9fafb 8px)",
          }}
        >
          <span className="rounded bg-white/80 px-2 py-0.5 text-sm font-semibold text-gray-400">
            OFF
          </span>
        </button>
      </div>
    );
  }

  // LEAVE
  if (cell.status === "LEAVE") {
    return (
      <div className="relative group">
        <UnassignBtn onUnassign={onUnassign} />
        <button
          type="button"
          onClick={onClick}
          className="w-full min-h-[68px] rounded-xl border border-yellow-200 bg-yellow-50 flex items-center justify-center cursor-pointer hover:bg-yellow-100 transition-colors"
        >
          <span className="text-sm font-semibold text-yellow-700">LEAVE</span>
        </button>
      </div>
    );
  }

  // WORKING — derive cell color from shift hex or default to blue
  const hex = cell.shift?.color ?? null;
  const cellStyle = hex
    ? { backgroundColor: `${hex}20`, borderColor: `${hex}70`, color: hex }
    : { backgroundColor: "#dbeafe", borderColor: "#93c5fd", color: "#1e40af" };

  return (
    <div className="relative group">
      <UnassignBtn onUnassign={onUnassign} />
      <button
        type="button"
        onClick={onClick}
        style={cellStyle}
        className="w-full min-h-[68px] rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {cell.shift ? (
          <>
            <span className="text-xs font-semibold leading-tight">
              {cell.shift.startTime} - {cell.shift.endTime}
            </span>
            <span className="text-[11px] font-medium opacity-60">
              ({cell.shift.code})
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold">WORKING</span>
        )}
      </button>
    </div>
  );
}

// ── RosterGrid ────────────────────────────────────────────────────────────────

interface Props {
  data:       RosterData;
  shifts:     Shift[];
  branchId:   string;
  viewMode:   "week" | "month";
  isPending:  boolean;
  onCellSave: (
    employeeId: string,
    date:       string,
    shiftId:    string | null,
    status:     ScheduleStatus | null,
  ) => void;
}

export function RosterGrid({ data, shifts, viewMode, isPending, onCellSave }: Props) {
  const [editDialog, setEditDialog] = useState<{
    employee: RosterEmployee;
    date:     string;
    cell:     ScheduleCell | null;
  } | null>(null);

  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const { dates, rows } = data;

  // ── Per-day stats ─────────────────────────────────────────────────────────

  const dailyStats = dates.map((date) => {
    let working = 0, off = 0, hours = 0;
    for (const row of rows) {
      const cell = row.schedules.find((s) => s.date === date);
      if (!cell?.status) continue;
      if (cell.status === "WORKING") {
        working++;
        if (cell.shift?.startTime && cell.shift?.endTime) {
          hours += shiftHours(cell.shift.startTime, cell.shift.endTime);
        }
      } else {
        off++;
      }
    }
    return { date, working, off, hours };
  });

  // Employees who have no schedule for the quick-add date
  const unscheduledForDate: RosterEmployee[] = quickAddDate
    ? rows
        .filter((r) => !r.schedules.find((s) => s.date === quickAddDate)?.status)
        .map((r) => r.employee)
    : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openEdit = useCallback(
    (employee: RosterEmployee, date: string, cell: ScheduleCell | null) => {
      setEditDialog({ employee, date, cell });
    },
    [],
  );

  const handleEditSave = useCallback(
    (shiftId: string | null, status: ScheduleStatus | null) => {
      if (!editDialog) return;
      onCellSave(editDialog.employee.id, editDialog.date, shiftId, status);
      setEditDialog(null);
    },
    [editDialog, onCellSave],
  );

  const handleQuickSave = useCallback(
    (employeeId: string, shiftId: string | null, status: ScheduleStatus) => {
      if (!quickAddDate) return;
      onCellSave(employeeId, quickAddDate, shiftId, status);
      setQuickAddDate(null);
    },
    [quickAddDate, onCellSave],
  );

  return (
    <>
      <div className={viewMode === "month"
        ? "overflow-x-auto rounded-xl border border-border bg-card shadow-sm [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 hover:[&::-webkit-scrollbar-thumb]:bg-primary/50"
        : "rounded-xl border border-border bg-card shadow-sm"
      }>
        <table className={viewMode === "month"
          ? "border-collapse text-sm"
          : "w-full table-fixed border-collapse text-sm"
        }>

          {/* ── Column headers ──────────────────────────────────────────── */}
          <thead>
            <tr className="border-b border-border">
              <th className={`sticky left-0 z-30 bg-card px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide ${viewMode === "month" ? "min-w-[160px]" : "w-[160px]"}`}>
                Staff Names
              </th>
              {dates.map((date) => {
                const { day, num } = formatDayHeader(date);
                return (
                  <th key={date} className={`px-1 py-2 text-center ${viewMode === "month" ? "min-w-[90px]" : ""}`}>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        {day} {num}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickAddDate(date)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        title={`Add schedule — ${day} ${num}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Sub-header: daily working/off summary ──────────────────── */}
            <tr className="border-b border-border bg-muted/20">
              <td className="sticky left-0 z-30 bg-card shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] px-4 py-2 text-xs font-semibold text-muted-foreground">
                Staff Member
              </td>
              {dailyStats.map(({ date, working, off }) => (
                <td key={date} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                  {working} / {off}
                </td>
              ))}
            </tr>
          </thead>

          {/* ── Employee rows ────────────────────────────────────────────── */}
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={dates.length + 1}
                  className="px-4 py-14 text-center"
                >
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum ada karyawan di cabang ini
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tambahkan karyawan ke cabang ini melalui menu Employees.
                  </p>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.employee.id}>
                {/* Name cell — card style */}
                <td className="sticky left-0 z-30 bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md">
                    <EmployeeAvatar name={row.employee.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">{row.employee.name}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/70">
                        {row.employee.role.name}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Schedule cells */}
                {row.schedules.map((cell) => (
                  <td key={cell.date} className="px-1 py-2">
                    <ShiftCell
                      cell={cell}
                      onClick={() => openEdit(row.employee, cell.date, cell)}
                      onUnassign={() => onCellSave(row.employee.id, cell.date, null, null)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="sticky left-0 z-30 bg-card shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Daily Count
              </td>
              {dailyStats.map(({ date, working, off }) => (
                <td key={date} className="px-2 py-2.5 text-center text-xs font-semibold">
                  <span className="text-primary">{working}</span>
                  <span className="text-muted-foreground">/{off}</span>
                </td>
              ))}
            </tr>

            <tr className="border-t border-border bg-muted/10">
              <td className="sticky left-0 z-30 bg-card shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Weekly Hours
              </td>
              {dailyStats.map(({ date, hours }) => (
                <td key={date} className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground">
                  {hours > 0 ? `${hours}h` : "—"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit dialog — click existing or empty cell */}
      <ShiftCellDialog
        open={!!editDialog}
        onOpenChange={(open) => { if (!open) setEditDialog(null); }}
        employee={editDialog?.employee ?? null}
        date={editDialog?.date ?? null}
        cell={editDialog?.cell ?? null}
        shifts={shifts}
        isPending={isPending}
        onSave={handleEditSave}
      />

      {/* Quick-add dialog — click "+" in column header */}
      <QuickAddDialog
        open={!!quickAddDate}
        onOpenChange={(open) => { if (!open) setQuickAddDate(null); }}
        date={quickAddDate}
        employees={unscheduledForDate}
        shifts={shifts}
        isPending={isPending}
        onSave={handleQuickSave}
      />
    </>
  );
}
