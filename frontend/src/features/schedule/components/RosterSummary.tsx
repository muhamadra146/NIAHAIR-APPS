import type { RosterData, Shift } from "../types";

interface Props {
  data:   RosterData | undefined;
  shifts: Shift[];
}

function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export function RosterSummary({ data, shifts }: Props) {
  if (!data) return null;

  const { dates, rows } = data;

  // All active master shifts — used as the legend reference
  const activeShifts = shifts.filter((s) => s.isActive);

  // Unassigned count (employees × dates with no schedule)
  let unassigned = 0;
  for (const row of rows) {
    for (const cell of row.schedules) {
      if (!cell.status) unassigned++;
    }
  }

  // Daily count
  const dailySummary = dates.map((date) => {
    let working = 0, off = 0;
    for (const row of rows) {
      const cell = row.schedules.find((s) => s.date === date);
      if (!cell?.status) continue;
      if (cell.status === "WORKING") working++;
      else off++;
    }
    return { date, working, off };
  });

  // Weekly hours per employee
  const employeeHours = rows
    .map((row) => {
      let total = 0;
      for (const cell of row.schedules) {
        if (cell.status === "WORKING" && cell.shift?.startTime && cell.shift?.endTime) {
          total += shiftHours(cell.shift.startTime, cell.shift.endTime);
        }
      }
      return { name: row.employee.name, hours: total };
    })
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-4">
      {/* ── Legend — all active master shifts ──────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Legend</h3>
        <div className="space-y-2.5">
          {activeShifts.map((shift) => {
            const hex = shift.color ?? "#3b82f6";
            return (
              <div key={shift.id} className="flex items-center gap-2.5">
                <div
                  className="h-4 w-7 rounded border shrink-0"
                  style={{ backgroundColor: `${hex}25`, borderColor: `${hex}70` }}
                />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{shift.code}</span>
                  {" — "}{shift.name}
                  {shift.isWorking && shift.startTime && shift.endTime
                    ? ` · ${shift.startTime}–${shift.endTime}`
                    : ""}
                </span>
              </div>
            );
          })}

          {unassigned > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-7 rounded border border-dashed border-gray-300 shrink-0" />
              <span className="text-xs text-muted-foreground">
                Belum diisi ({unassigned})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Staff Count ────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Daily Staff Count</h3>
        <div className="space-y-1.5">
          {dailySummary.map(({ date, working, off }) => (
            <div key={date} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{formatShortDate(date)}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-green-600">{working}</span>
                <span className="text-muted-foreground">working /</span>
                <span className="text-muted-foreground">{off} off</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Weekly Hours ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Weekly Hours</h3>
        <div className="space-y-1.5">
          {employeeHours.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada jadwal assigned.</p>
          ) : (
            employeeHours.map(({ name, hours }) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[110px] text-muted-foreground">{name}</span>
                <span className="font-semibold">{hours}h</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
