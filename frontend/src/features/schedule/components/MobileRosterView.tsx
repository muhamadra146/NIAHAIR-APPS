import type { RosterData, ScheduleStatus } from "../types";

interface Props {
  data: RosterData;
}

const SHIFT_PILL: Record<string, string> = {
  blue:  "bg-blue-100  text-blue-700  border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
};
const OFF_PILL   = "bg-gray-100  text-gray-500  border-gray-200";
const LEAVE_PILL = "bg-yellow-50 text-yellow-700 border-yellow-300";

function dayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

function CellPill({ status, shift }: { status: ScheduleStatus | null; shift: { code: string; startTime: string | null; endTime: string | null; color: string | null } | null }) {
  if (!status) return <span className="text-xs text-gray-300 italic">—</span>;

  if (status === "OFF") {
    return (
      <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${OFF_PILL}`}>
        OFF
      </span>
    );
  }

  if (status === "LEAVE") {
    return (
      <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${LEAVE_PILL}`}>
        LEAVE
      </span>
    );
  }

  if (shift) {
    const cls = shift.color ? (SHIFT_PILL[shift.color] ?? SHIFT_PILL.blue) : SHIFT_PILL.blue;
    return (
      <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
        {shift.code} {shift.startTime}–{shift.endTime}
      </span>
    );
  }

  return (
    <span className="inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700 border-blue-200">
      WORKING
    </span>
  );
}

export function MobileRosterView({ data }: Props) {
  const { dates, rows } = data;

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No employees in this branch.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.employee.id} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3">
            <p className="font-semibold">{row.employee.name}</p>
            <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
          </div>

          <div className="space-y-1.5">
            {row.schedules.map((cell, i) => (
              <div key={cell.date} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground shrink-0">
                  {dayLabel(dates[i] ?? cell.date)}:
                </span>
                <CellPill status={cell.status} shift={cell.shift} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
