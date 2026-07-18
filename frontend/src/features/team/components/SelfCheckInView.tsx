import { useState, useEffect } from "react";
import {
  LogIn, LogOut, Clock, Calendar, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Timer, UserCheck, UserX,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyToday, useMyAttendance, useCheckIn, useCheckOut } from "../hooks";
import type { AttendanceStatus } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

// For live session (today card) — falls back to now if no checkout
function fmtDuration(checkIn: string | null | undefined, checkOut: string | null | undefined): string {
  if (!checkIn) return "—";
  const end  = checkOut ? new Date(checkOut) : new Date();
  const mins = Math.max(0, Math.floor((end.getTime() - new Date(checkIn).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

// For history records — requires both times, otherwise "—"
function fmtDurationStrict(checkIn: string | null | undefined, checkOut: string | null | undefined): string {
  if (!checkIn || !checkOut) return "—";
  const mins = Math.max(0, Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

function timeToMins(hhmm: string | null | undefined): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function statusInfo(s: AttendanceStatus | undefined): { label: string; dot: string; text: string } {
  switch (s) {
    case "PRESENT":     return { label: "Hadir",         dot: "bg-emerald-400", text: "text-emerald-700" };
    case "LATE":        return { label: "Terlambat",      dot: "bg-amber-400",   text: "text-amber-700"   };
    case "ABSENT":      return { label: "Absen",          dot: "bg-red-400",     text: "text-red-700"     };
    case "HALF_DAY":    return { label: "Setengah Hari",  dot: "bg-orange-400",  text: "text-orange-700"  };
    case "EARLY_LEAVE": return { label: "Pulang Cepat",   dot: "bg-sky-400",     text: "text-sky-700"     };
    default:            return { label: "Belum Absen",    dot: "bg-slate-400",   text: "text-slate-500"   };
  }
}

async function getGeolocation(): Promise<{ latitude?: number; longitude?: number }> {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 6000 },
    );
  });
}

// ── Live Clock Hook ───────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── Hero Check-In Card ────────────────────────────────────────────────────────

function HeroCheckInCard() {
  const now = useClock();
  const { data: today, isLoading } = useMyToday();
  const checkInMut  = useCheckIn();
  const checkOutMut = useCheckOut();
  const [geoError, setGeoError]         = useState(false);
  const [geofenceMsg, setGeofenceMsg]   = useState<string | null>(null);

  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const secStr  = `:${String(now.getSeconds()).padStart(2, "0")}`;
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (isLoading) return <Skeleton className="h-80 w-full rounded-2xl" />;

  const att    = today?.attendance;
  const hasIn  = !!att?.checkInAt;
  const hasOut = !!att?.checkOutAt;
  const isOff  = today?.status === "OFF" || today?.status === "LEAVE";
  const shift  = today?.shift;

  // Shift progress bar
  const shiftStartMin = timeToMins(shift?.startTime);
  const shiftEndMin   = timeToMins(shift?.endTime);
  const nowMin        = now.getHours() * 60 + now.getMinutes();
  const shiftDur      = shiftEndMin - shiftStartMin;
  const elapsed       = shiftDur > 0 ? Math.max(0, Math.min(nowMin - shiftStartMin, shiftDur)) : 0;
  const progressPct   = shiftDur > 0 ? Math.round((elapsed / shiftDur) * 100) : 0;

  // Session status tag
  const sessionTag = (() => {
    if (isOff) return { label: "Hari Libur", cls: "bg-slate-700 text-slate-300 border-slate-600", dot: "bg-slate-500" };
    if (hasIn && hasOut) return { label: "Selesai", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" };
    if (hasIn) return { label: "Sedang Bekerja", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30", dot: "bg-blue-400 animate-pulse" };
    return { label: "Belum Absen", cls: "bg-slate-700/80 text-slate-300 border-slate-600", dot: "bg-slate-500" };
  })();

  function extractApiMsg(err: unknown): string {
    if (err && typeof err === "object" && "response" in err) {
      const r = (err as { response?: { data?: { message?: string } } }).response;
      if (r?.data?.message) return r.data.message;
    }
    return err instanceof Error ? err.message : "Terjadi kesalahan";
  }

  async function handleCheckIn() {
    setGeoError(false);
    setGeofenceMsg(null);
    const coords = await getGeolocation();
    if (!coords.latitude) setGeoError(true);
    try {
      await checkInMut.mutateAsync({ staffScheduleId: today!.scheduleId, ...coords });
    } catch (err) {
      const msg = extractApiMsg(err);
      if (msg.toLowerCase().includes("terlalu jauh") || msg.toLowerCase().includes("radius")) {
        setGeofenceMsg(msg);
      }
    }
  }

  async function handleCheckOut() {
    setGeoError(false);
    setGeofenceMsg(null);
    const coords = await getGeolocation();
    if (!coords.latitude) setGeoError(true);
    try {
      await checkOutMut.mutateAsync({ staffScheduleId: today!.scheduleId, ...coords });
    } catch (err) {
      const msg = extractApiMsg(err);
      if (msg.toLowerCase().includes("terlalu jauh") || msg.toLowerCase().includes("radius")) {
        setGeofenceMsg(msg);
      }
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">

      {/* ── Dark hero header ── */}
      <div className="relative bg-[#0f172a] px-6 py-8 overflow-hidden">
        {/* Background accents */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-fuchsia-500/5" />

        <div className="relative">
          {/* Date + status */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 truncate">{dateStr}</p>
            {today && (
              <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${sessionTag.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sessionTag.dot}`} />
                {sessionTag.label}
              </span>
            )}
          </div>

          {/* Live clock */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-white sm:text-6xl">{timeStr}</span>
            <span className="text-2xl font-light text-slate-500 tabular-nums">{secStr}</span>
          </div>

          {/* Shift name */}
          {shift ? (
            <p className="text-sm text-slate-400 mt-1">
              Shift <span className="text-slate-300 font-medium">{shift.name}</span>
              {" "}· {shift.startTime} – {shift.endTime}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Tidak ada shift terjadwal</p>
          )}
        </div>
      </div>

      {/* ── Shift progress bar ── */}
      {shift && shiftDur > 0 && (
        <div className="bg-[#0f172a] px-6 pb-5">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
            <span>{shift.startTime}</span>
            <span className="text-slate-400 font-medium tabular-nums">{progressPct}% shift selesai</span>
            <span>{shift.endTime}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all duration-1000"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── White body ── */}
      <div className="bg-white px-6 py-5">

        {/* Check-in / Check-out tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded-xl px-4 py-3.5 border ${
            hasIn
              ? "bg-emerald-50 border-emerald-100"
              : "bg-slate-50 border-slate-100"
          }`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Masuk</p>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${hasIn ? "text-emerald-700" : "text-slate-300"}`}>
              {fmtTime(att?.checkInAt)}
            </p>
            <p className="mt-1 text-[10px] font-medium">
              {att?.lateMinutes != null && att.lateMinutes > 0
                ? <span className="text-amber-600">+{att.lateMinutes} mnt terlambat</span>
                : hasIn
                  ? <span className="text-emerald-600">Tepat waktu</span>
                  : <span className="text-slate-300">Belum absen</span>}
            </p>
          </div>

          <div className={`rounded-xl px-4 py-3.5 border ${
            hasOut
              ? "bg-[#0f172a] border-slate-800"
              : "bg-slate-50 border-slate-100"
          }`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${hasOut ? "text-slate-400" : "text-slate-400"}`}>
              Keluar
            </p>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${hasOut ? "text-white" : "text-slate-300"}`}>
              {fmtTime(att?.checkOutAt)}
            </p>
            <p className="mt-1 text-[10px] font-medium">
              {hasIn && !hasOut
                ? <span className="text-blue-500">Sedang bekerja · {fmtDuration(att?.checkInAt, null)}</span>
                : hasOut && att?.overtimeMinutes != null && att.overtimeMinutes > 0
                  ? <span className="text-blue-300">+{att.overtimeMinutes} mnt lembur</span>
                  : hasOut
                    ? <span className="text-slate-400">{fmtDuration(att?.checkInAt, att?.checkOutAt)} total</span>
                    : <span className="text-slate-300">Belum keluar</span>}
            </p>
          </div>
        </div>

        {/* Geofence error */}
        {geofenceMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">Di luar area absensi</p>
                <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{geofenceMsg}</p>
                <p className="text-xs text-red-500 mt-1.5">
                  Hubungi atasan jika kamu merasa ini keliru, atau pindah ke area yang sesuai dan coba lagi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Geo warning (no GPS) */}
        {geoError && !geofenceMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lokasi tidak terdeteksi. Absen tetap dicatat tanpa koordinat.
          </div>
        )}

        {/* Action */}
        {!today ? (
          <div className="flex flex-col items-center justify-center py-5 gap-2 text-slate-400">
            <Calendar className="h-8 w-8 opacity-20" />
            <p className="text-sm">Tidak ada jadwal hari ini</p>
          </div>
        ) : isOff ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-100 py-3.5 text-sm text-slate-400">
            <Calendar className="h-4 w-4" />
            Hari libur / cuti
          </div>
        ) : !hasIn ? (
          <Button
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-sm"
            onClick={handleCheckIn}
            disabled={checkInMut.isPending}
          >
            <LogIn className="mr-2 h-4 w-4" />
            {checkInMut.isPending ? "Memproses..." : "Absen Masuk"}
          </Button>
        ) : !hasOut ? (
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-slate-200 text-sm font-semibold"
            onClick={handleCheckOut}
            disabled={checkOutMut.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {checkOutMut.isPending ? "Memproses..." : "Absen Keluar"}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-3.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Absensi selesai · {fmtDuration(att?.checkInAt, att?.checkOutAt)} bekerja hari ini
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monthly Summary Stats ─────────────────────────────────────────────────────

function MonthlyStats({ month, year }: { month: number; year: number }) {
  const { data, isLoading } = useMyAttendance({ month, year, limit: 31 });
  const records = data?.data ?? [];

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  const hadir     = records.filter(r => r.status === "PRESENT").length;
  const terlambat = records.filter(r => r.status === "LATE").length;
  const absen     = records.filter(r => r.status === "ABSENT").length;
  const lainnya   = records.filter(r => ["HALF_DAY", "EARLY_LEAVE"].includes(r.status)).length;
  const total     = records.length;

  const stats = [
    { label: "Hadir",     value: hadir,     clr: "text-emerald-600" },
    { label: "Terlambat", value: terlambat, clr: "text-amber-500"   },
    { label: "Lainnya",   value: lainnya,   clr: "text-slate-500"   },
    { label: "Absen",     value: absen,     clr: "text-red-500"     },
  ] as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Attendance rate bar */}
      {total > 0 && (
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${Math.round((hadir / total) * 100)}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-4 divide-x divide-slate-100">
        {stats.map(({ label, value, clr }) => (
          <div key={label} className="flex flex-col items-center justify-center py-3.5 px-2">
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${clr}`}>{value}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

function HistoryTable() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading } = useMyAttendance({ month, year, limit: 31 });
  const records = data?.data ?? [];

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrent) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthLabel     = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-3">
      <MonthlyStats month={month} year={year} />

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">Riwayat Kehadiran</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[110px] text-center text-xs font-medium text-slate-700">{monthLabel}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} disabled={isCurrentMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-px divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-14 ml-auto" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 text-slate-400">
            <Calendar className="h-8 w-8 opacity-20" />
            <p className="text-sm">Tidak ada data kehadiran bulan ini</p>
          </div>
        ) : (
          <>
            {/* Mobile — card list */}
            <div className="flex flex-col gap-2 p-3 sm:hidden">
              {records.map((r) => {
                const { label, dot, text } = statusInfo(r.status);
                const dur = fmtDurationStrict(r.checkInAt, r.checkOutAt);
                return (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                    {/* Date + status */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-800">{fmtDateShort(r.workDate)}</p>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${text}`}>
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {label}
                      </span>
                    </div>
                    {/* Times row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Masuk</p>
                        <p className="font-mono text-base font-bold text-slate-700">{fmtTime(r.checkInAt)}</p>
                      </div>
                      <div className="text-slate-300 text-sm">→</div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Keluar</p>
                        <p className="font-mono text-base font-bold text-slate-700">{fmtTime(r.checkOutAt)}</p>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Durasi</p>
                        <p className="text-base font-bold tabular-nums text-slate-600">{dur}</p>
                      </div>
                    </div>
                    {/* Late warning */}
                    {r.lateMinutes > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-medium text-amber-600">Terlambat {r.lateMinutes} menit</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Tanggal", "Status", "Masuk", "Keluar", "Durasi", "Terlambat"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const { label, dot, text } = statusInfo(r.status);
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-medium text-slate-700">{fmtDateShort(r.workDate)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${text}`}>
                            <span className={`h-2 w-2 rounded-full ${dot}`} />
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600">{fmtTime(r.checkInAt)}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-600">{fmtTime(r.checkOutAt)}</td>
                        <td className="px-5 py-3.5 text-slate-500 tabular-nums font-medium">{fmtDurationStrict(r.checkInAt, r.checkOutAt)}</td>
                        <td className="px-5 py-3.5">
                          {r.lateMinutes > 0
                            ? <span className="text-amber-600 font-medium tabular-nums">{r.lateMinutes} mnt</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SelfCheckInView() {
  const [tab, setTab] = useState<"today" | "history">("today");

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {(["today", "history"] as const).map((t) => {
          const label = t === "today" ? "Hari Ini" : "Riwayat";
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "today" ? <HeroCheckInCard /> : <HistoryTable />}
    </div>
  );
}
