import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Clock, LogIn, LogOut, AlertCircle, Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge }         from "@/components/ui/badge";
import { Button }        from "@/components/ui/button";
import { useMySchedules } from "../hooks";
import type { MyScheduleItem } from "../types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function formatDate(dateStr: string): { full: string; short: string; day: string } {
  const d = new Date(dateStr);
  return {
    full:  d.toLocaleDateString("id-ID", { weekday: "long",  day: "numeric", month: "long", year: "numeric" }),
    short: d.toLocaleDateString("id-ID", { day: "numeric",  month: "short" }),
    day:   d.toLocaleDateString("id-ID", { weekday: "short" }).toUpperCase(),
  };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatWeekRange(startDate: string): string {
  const start = new Date(startDate);
  const end   = addDays(start, 6);
  return `${formatDate(toISODate(start)).short} – ${formatDate(toISODate(end)).short} ${end.getUTCFullYear()}`;
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  return (
    today.getUTCFullYear() === new Date(dateStr).getUTCFullYear() &&
    today.getUTCMonth()    === new Date(dateStr).getUTCMonth()    &&
    today.getUTCDate()     === new Date(dateStr).getUTCDate()
  );
}

// ── Status display helpers ─────────────────────────────────────────────────────

function ScheduleStatusBadge({ status }: { status: MyScheduleItem["status"] }) {
  if (status === "WORKING") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
        Kerja
      </Badge>
    );
  }
  if (status === "OFF") {
    return (
      <Badge variant="secondary" className="text-muted-foreground">
        Libur
      </Badge>
    );
  }
  if (status === "LEAVE") {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
        Cuti / Izin
      </Badge>
    );
  }
  return null;
}

function AttendanceBadge({ attendance }: { attendance: MyScheduleItem["attendance"] }) {
  if (!attendance) return null;

  if (attendance.checkOut) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <LogOut className="h-3 w-3 text-primary" />
        Pulang {formatTime(attendance.checkOut)}
      </span>
    );
  }
  if (attendance.checkIn) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <LogIn className="h-3 w-3 text-emerald-500" />
        Masuk {formatTime(attendance.checkIn)}
      </span>
    );
  }
  return null;
}

// ── DayCard ───────────────────────────────────────────────────────────────────

function DayCard({ dateStr, item }: { dateStr: string; item: MyScheduleItem | null }) {
  const { day, short } = formatDate(dateStr);
  const today          = isToday(dateStr);

  return (
    <div
      className={[
        "rounded-xl border bg-card p-4 transition-shadow",
        today
          ? "border-primary/40 shadow-sm ring-1 ring-primary/20"
          : "border-border hover:shadow-sm",
      ].join(" ")}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={[
              "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full text-xs font-bold leading-none",
              today
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            <span className="text-[10px] font-semibold leading-none opacity-75">{day}</span>
            <span className="mt-0.5 text-sm leading-none">{short.split(" ")[0]}</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{short}</p>
            {today && (
              <span className="text-[10px] text-primary font-medium">Hari ini</span>
            )}
          </div>
        </div>

        {item ? (
          <ScheduleStatusBadge status={item.status} />
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Belum dijadwal
          </Badge>
        )}
      </div>

      {/* Content */}
      {item && item.status === "WORKING" && (
        <div className="space-y-1.5">
          {item.shift ? (
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{item.shift.name}</span>
              {item.shift.startTime && item.shift.endTime && (
                <span className="text-muted-foreground">
                  ({item.shift.startTime} – {item.shift.endTime})
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Shift tidak ditentukan</p>
          )}

          {item.attendance && (
            <div className="mt-1.5">
              <AttendanceBadge attendance={item.attendance} />
            </div>
          )}

          {!item.attendance && (
            <p className="text-xs text-muted-foreground italic">Belum absen</p>
          )}
        </div>
      )}

      {item && item.status === "OFF" && (
        <p className="text-xs text-muted-foreground">Hari libur — tidak masuk kerja</p>
      )}

      {item && item.status === "LEAVE" && (
        <p className="text-xs text-muted-foreground">Cuti / izin yang disetujui</p>
      )}

      {/* Notes */}
      {item?.notes && (
        <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2 italic">
          {item.notes}
        </p>
      )}
    </div>
  );
}

// ── WeekSummary ───────────────────────────────────────────────────────────────

function WeekSummary({ items }: { items: MyScheduleItem[] }) {
  const working = items.filter((i) => i.status === "WORKING").length;
  const off     = items.filter((i) => i.status === "OFF").length;
  const leave   = items.filter((i) => i.status === "LEAVE").length;
  const absent  = items.filter(
    (i) => i.status === "WORKING" && !i.attendance?.checkIn,
  ).length;

  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-card p-4">
      <div className="text-center">
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{working}</p>
        <p className="text-xs text-muted-foreground">Kerja</p>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-muted-foreground">{off}</p>
        <p className="text-xs text-muted-foreground">Libur</p>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{leave}</p>
        <p className="text-xs text-muted-foreground">Cuti</p>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-rose-500 dark:text-rose-400">{absent}</p>
        <p className="text-xs text-muted-foreground">Belum absen</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MySchedulePage() {
  const [startDate, setStartDate] = useState<string>(() =>
    toISODate(getMonday(new Date())),
  );

  const endDate = useMemo(
    () => toISODate(addDays(new Date(startDate), 6)),
    [startDate],
  );

  const { data = [], isLoading, isError, refetch } = useMySchedules(
    { startDate, endDate },
  );

  // Build date→item lookup
  const itemMap = useMemo(() => {
    const map = new Map<string, MyScheduleItem>();
    for (const item of data) {
      const date = item.workDate.split("T")[0];
      map.set(date, item);
    }
    return map;
  }, [data]);

  // Ordered 7 days for the week
  const weekDates = useMemo<string[]>(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(toISODate(addDays(new Date(startDate), i)));
    }
    return dates;
  }, [startDate]);

  // Navigation
  const handlePrev = useCallback(() => {
    setStartDate((d) => toISODate(addDays(new Date(d), -7)));
  }, []);

  const handleNext = useCallback(() => {
    setStartDate((d) => toISODate(addDays(new Date(d), 7)));
  }, []);

  const handleToday = useCallback(() => {
    setStartDate(toISODate(getMonday(new Date())));
  }, []);

  const isCurrentWeek =
    startDate === toISODate(getMonday(new Date()));

  return (
    <PageContainer
      title="Jadwal Saya"
      subtitle="Jadwal kerja minggu ini — read only"
    >
      <div className="space-y-4 max-w-2xl mx-auto">

        {/* ── Navigation bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Minggu sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} aria-label="Minggu berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {formatWeekRange(startDate)}
          </div>

          <Button
            variant={isCurrentWeek ? "secondary" : "outline"}
            size="sm"
            onClick={handleToday}
            disabled={isCurrentWeek}
          >
            Minggu Ini
          </Button>
        </div>

        {/* ── Error banner ──────────────────────────────────── */}
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Gagal memuat jadwal.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="ml-auto underline underline-offset-2 hover:no-underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Memuat jadwal…</span>
          </div>
        )}

        {/* ── Week summary ─────────────────────────────────── */}
        {!isLoading && data.length > 0 && (
          <WeekSummary items={data} />
        )}

        {/* ── Day cards ──────────────────────────────────────── */}
        <div className="space-y-2">
          {weekDates.map((date) => (
            <DayCard
              key={date}
              dateStr={date}
              item={itemMap.get(date) ?? null}
            />
          ))}
        </div>

        {/* ── Empty state ─────────────────────────────────────── */}
        {!isLoading && !isError && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada jadwal untuk minggu ini
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hubungi manager untuk mengatur jadwal kamu.
            </p>
          </div>
        )}

      </div>
    </PageContainer>
  );
}
