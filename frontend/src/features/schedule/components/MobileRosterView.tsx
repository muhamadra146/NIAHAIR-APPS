import React from "react";
import { Plus, X } from "lucide-react";
import type { RosterData, ScheduleCell, RosterEmployee, ScheduleStatus } from "../types";

interface Props {
  data:         RosterData;
  isViewOnly?:  boolean;
  onCellClick?: (employee: RosterEmployee, date: string, cell: ScheduleCell | null) => void;
  onUnassign?:  (employeeId: string, date: string) => void;
}

function shiftColorStyle(hex: string | null): React.CSSProperties {
  if (!hex) return { backgroundColor: "#dbeafe", borderColor: "#93c5fd", color: "#1e40af" };
  return {
    backgroundColor: `${hex}22`,
    borderColor:     `${hex}88`,
    color:           hex,
  };
}

function CellPill({
  cell,
  onClick,
  onUnassign,
  isViewOnly,
}: {
  cell:        ScheduleCell;
  onClick:     () => void;
  onUnassign:  () => void;
  isViewOnly?: boolean;
}) {
  const { status, shift } = cell;

  if (!status) {
    // Empty cell — tap to add
    if (isViewOnly) {
      return <span className="text-xs text-gray-300 italic">—</span>;
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-400 hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus className="h-2.5 w-2.5" />
        Tambah
      </button>
    );
  }

  const baseClass = "relative inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium";

  let content: React.ReactNode;
  let pillClass = baseClass;
  let pillStyle: React.CSSProperties = {};

  if (status === "OFF") {
    pillClass += " bg-gray-100 text-gray-500 border-gray-200";
    content = "OFF";
  } else if (status === "LEAVE") {
    pillClass += " bg-yellow-50 text-yellow-700 border-yellow-300";
    content = "LEAVE";
  } else {
    // WORKING
    pillStyle = shiftColorStyle(shift?.color ?? null);
    content = shift
      ? `${shift.code} ${shift.startTime}–${shift.endTime}`
      : "WORKING";
  }

  if (isViewOnly) {
    return <span className={pillClass} style={pillStyle}>{content}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={pillClass}
        style={pillStyle}
      >
        {content}
      </button>
      {cell.scheduleId && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnassign(); }}
          className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
          title="Hapus jadwal"
          aria-label="Hapus jadwal"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
}

export function MobileRosterView({ data, isViewOnly = false, onCellClick, onUnassign }: Props) {
  const { dates, rows } = data;

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Belum ada karyawan di cabang ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.employee.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{row.employee.name}</p>
              <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
            </div>
          </div>

          <div className="space-y-2">
            {row.schedules.map((cell) => (
              <div key={cell.date} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {dayLabel(cell.date)}:
                </span>
                <CellPill
                  cell={cell}
                  isViewOnly={isViewOnly}
                  onClick={() => onCellClick?.(row.employee, cell.date, cell)}
                  onUnassign={() => onUnassign?.(row.employee.id, cell.date)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
