import { useState } from "react";
import { LogIn, LogOut, Clock, Calendar, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function statusLabel(s: AttendanceStatus | undefined): { label: string; className: string } {
  switch (s) {
    case "PRESENT":     return { label: "Hadir",         className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "LATE":        return { label: "Terlambat",      className: "bg-amber-50  text-amber-700  border border-amber-200"  };
    case "ABSENT":      return { label: "Absen",          className: "bg-red-50    text-red-700    border border-red-200"    };
    case "HALF_DAY":    return { label: "Setengah Hari",  className: "bg-orange-50 text-orange-700 border border-orange-200" };
    case "EARLY_LEAVE": return { label: "Pulang Cepat",   className: "bg-sky-50    text-sky-700    border border-sky-200"    };
    default:            return { label: "Belum Absen",    className: "bg-slate-100 text-slate-600  border border-slate-200"  };
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

// ── Today card ────────────────────────────────────────────────────────────────

function TodayCard() {
  const { data: today, isLoading } = useMyToday();
  const checkInMut  = useCheckIn();
  const checkOutMut = useCheckOut();
  const [geoError, setGeoError] = useState(false);

  if (isLoading) return <Skeleton className="h-52 w-full rounded-2xl" />;

  if (!today) {
    return (
      <Card className="rounded-2xl border-slate-200/60 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <Calendar className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-700">Tidak ada jadwal hari ini</p>
          <p className="mt-1 text-sm text-slate-400">Hubungi manager jika ada kesalahan</p>
        </CardContent>
      </Card>
    );
  }

  const att    = today.attendance;
  const hasIn  = !!att?.checkInAt;
  const hasOut = !!att?.checkOutAt;
  const { label, className } = statusLabel(att?.status);
  const isOff  = today.status === "OFF" || today.status === "LEAVE";

  async function handleCheckIn() {
    setGeoError(false);
    const coords = await getGeolocation();
    if (!coords.latitude) setGeoError(true);
    await checkInMut.mutateAsync({ staffScheduleId: today!.scheduleId, ...coords });
  }

  async function handleCheckOut() {
    setGeoError(false);
    const coords = await getGeolocation();
    if (!coords.latitude) setGeoError(true);
    await checkOutMut.mutateAsync({ staffScheduleId: today!.scheduleId, ...coords });
  }

  return (
    <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jadwal Hari Ini</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{fmtDateLong(new Date())}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
            {label}
          </span>
        </div>
      </div>

      <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
        {/* Shift info */}
        {today.shift && (
          <div className="mb-4 flex items-center gap-3">
            <div
              className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center sm:h-10 sm:w-10"
              style={{ backgroundColor: today.shift.color ? `${today.shift.color}20` : "#f1f5f9" }}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: today.shift.color ?? "#64748b" }} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm sm:text-base">{today.shift.name}</p>
              <p className="text-xs text-slate-500 sm:text-sm">
                {today.shift.startTime ?? "—"} – {today.shift.endTime ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* Masuk / Keluar tiles */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-3 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">Masuk</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${hasIn ? "text-emerald-600" : "text-slate-300"}`}>
              {fmtTime(att?.checkInAt)}
            </p>
            {att?.lateMinutes != null && att.lateMinutes > 0 && (
              <p className="mt-0.5 text-[10px] text-amber-500 sm:text-xs">Terlambat {att.lateMinutes} menit</p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">Keluar</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${hasOut ? "text-slate-700" : "text-slate-300"}`}>
              {fmtTime(att?.checkOutAt)}
            </p>
            {att?.overtimeMinutes != null && att.overtimeMinutes > 0 && (
              <p className="mt-0.5 text-[10px] text-blue-500 sm:text-xs">Lembur {att.overtimeMinutes} menit</p>
            )}
          </div>
        </div>

        {/* Geo warning */}
        {geoError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lokasi tidak terdeteksi. Absen tetap dicatat tanpa koordinat.
          </div>
        )}

        {/* Action */}
        {isOff ? (
          <p className="text-center text-sm text-slate-400">Hari libur / cuti</p>
        ) : !hasIn ? (
          <Button
            className="h-11 w-full rounded-xl text-sm font-semibold sm:h-12 sm:text-base"
            onClick={handleCheckIn}
            disabled={checkInMut.isPending}
          >
            <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {checkInMut.isPending ? "Memproses..." : "Absen Masuk"}
          </Button>
        ) : !hasOut ? (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200 text-sm font-semibold sm:h-12 sm:text-base"
            onClick={handleCheckOut}
            disabled={checkOutMut.isPending}
          >
            <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {checkOutMut.isPending ? "Memproses..." : "Absen Keluar"}
          </Button>
        ) : (
          <p className="text-center text-sm font-medium text-emerald-600">Absensi selesai hari ini ✓</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryTable() {
  const now  = new Date();
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

  const monthLabel   = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <Card className="rounded-2xl border-slate-200/60 shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
        <p className="font-semibold text-slate-800 text-sm sm:text-base">Riwayat Kehadiran</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[100px] text-center text-xs font-medium text-slate-700 sm:min-w-[120px] sm:text-sm">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-6">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">Tidak ada data kehadiran bulan ini</div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {records.map((r) => {
              const { label, className } = statusLabel(r.status);
              return (
                <li key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{fmtDateShort(r.workDate)}</p>
                    <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
                      {label}
                    </span>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="font-mono text-sm text-slate-700">
                      {fmtTime(r.checkInAt)} <span className="text-slate-300">→</span> {fmtTime(r.checkOutAt)}
                    </p>
                    {r.lateMinutes > 0 && (
                      <p className="mt-0.5 text-xs text-amber-600">{r.lateMinutes} mnt terlambat</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {["Tanggal","Status","Masuk","Keluar","Terlambat"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => {
                  const { label, className } = statusLabel(r.status);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4 text-slate-700">{fmtDateShort(r.workDate)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600">{fmtTime(r.checkInAt)}</td>
                      <td className="px-5 py-4 font-mono text-slate-600">{fmtTime(r.checkOutAt)}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {r.lateMinutes > 0
                          ? <span className="text-amber-600">{r.lateMinutes} mnt</span>
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SelfCheckInView() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <TodayCard />
      <HistoryTable />
    </div>
  );
}
