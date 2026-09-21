import { useState, useMemo } from "react";
import {
  Download, Loader2, AlertCircle, User,
  Search, UserCheck, UserX, CalendarCheck,
  Clock, Timer, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer }  from "@/components/layout/PageContainer";
import { Button }         from "@/components/ui/button";
import { Input }          from "@/components/ui/input";
import { Badge }          from "@/components/ui/badge";
import { useAuthStore }   from "@/stores/authStore";
import { useAttendanceReport } from "../hooks";
import type { AttendanceReportRow } from "../types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getFirstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getLastOfMonth(date: Date): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtMinutes(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}

// ── Rate badge ────────────────────────────────────────────────────────────────

function RateBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 95 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    rate >= 80 ? "bg-amber-100 text-amber-700 border-amber-200" :
                 "bg-red-100 text-red-700 border-red-200";
  return (
    <Badge className={`border font-semibold tabular-nums ${cls}`}>
      {rate.toFixed(1)}%
    </Badge>
  );
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(rows: AttendanceReportRow[], startDate: string, endDate: string) {
  const header = [
    "Kode Karyawan", "Nama", "Jabatan",
    "Hari Terjadwal", "Hadir", "Absen", "Cuti", "Izin", "Sakit",
    "Terlambat", "Pulang Cepat", "Setengah Hari",
    "Menit Terlambat", "Menit Pulang Cepat", "Menit Lembur",
    "Kerja Hari Libur", "Tingkat Kehadiran (%)",
  ].join(",");

  const csvRows = rows.map((r) =>
    [
      r.employee.employeeCode ?? "",
      `"${r.employee.name}"`,
      `"${r.employee.role.name}"`,
      r.scheduledDays,
      r.presentDays,
      r.absentDays,
      r.leaveDays,
      r.izinDays,
      r.sakitDays,
      r.lateDays,
      r.earlyLeaveDays,
      r.halfDays,
      r.lateMinutes,
      r.earlyLeaveMinutes,
      r.overtimeMinutes,
      r.holidayWorkDays,
      r.attendanceRate.toFixed(1),
    ].join(",")
  );

  const csv = [header, ...csvRows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `laporan-kehadiran_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Summary cards ─────────────────────────────────────────────────────────────

interface CardDef {
  label:  string;
  value:  string | number;
  sub:    string;
  icon:   LucideIcon;
  /** tailwind classes: text, bg, icon, border */
  color:  { text: string; bg: string; icon: string; border: string };
}

function SummaryCard({ label, value, sub, icon: Icon, color }: CardDef) {
  return (
    <div className={`rounded-xl border ${color.border} bg-card shadow-sm overflow-hidden`}>
      {/* colored top accent bar */}
      <div className={`h-0.5 w-full ${color.bg.replace("bg-", "bg-").replace("50", "400")}`} />
      <div className="px-4 py-4">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${color.bg} mb-3`}>
          <Icon className={`h-4 w-4 ${color.icon}`} />
        </div>
        <p className={`text-2xl font-bold tabular-nums leading-none ${color.text}`}>{value}</p>
        <p className="text-xs font-medium text-foreground mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SummaryCards({ rows }: { rows: AttendanceReportRow[] }) {
  const totalScheduled = rows.reduce((s, r) => s + r.scheduledDays,   0);
  const totalPresent   = rows.reduce((s, r) => s + r.presentDays,     0);
  const totalAbsent    = rows.reduce((s, r) => s + r.absentDays,      0);
  const totalLate      = rows.reduce((s, r) => s + r.lateDays,        0);
  const totalOvertime  = rows.reduce((s, r) => s + r.overtimeMinutes, 0);
  const totalIzinResmi = rows.reduce((s, r) => s + r.leaveDays + r.izinDays + r.sakitDays, 0);
  const avgRate        = rows.length
    ? rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length
    : 0;

  const rateColor =
    avgRate >= 95 ? { text: "text-emerald-700", bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100" } :
    avgRate >= 80 ? { text: "text-amber-700",   bg: "bg-amber-50",   icon: "text-amber-600",   border: "border-amber-100"   } :
                   { text: "text-red-700",      bg: "bg-red-50",     icon: "text-red-600",     border: "border-red-100"     };

  const cards: CardDef[] = [
    {
      label: "Total Hadir",
      value: `${totalPresent}/${totalScheduled}`,
      sub:   "hari terjadwal",
      icon:  UserCheck,
      color: { text: "text-emerald-700", bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100" },
    },
    {
      label: "Absen",
      value: totalAbsent,
      sub:   "tanpa keterangan",
      icon:  UserX,
      color: { text: "text-red-700", bg: "bg-red-50", icon: "text-red-600", border: "border-red-100" },
    },
    {
      label: "Izin Resmi",
      value: totalIzinResmi,
      sub:   "cuti · izin · sakit",
      icon:  CalendarCheck,
      color: { text: "text-sky-700", bg: "bg-sky-50", icon: "text-sky-600", border: "border-sky-100" },
    },
    {
      label: "Terlambat",
      value: totalLate,
      sub:   "hari",
      icon:  Clock,
      color: { text: "text-amber-700", bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
    },
    {
      label: "Total Lembur",
      value: fmtMinutes(totalOvertime),
      sub:   "menit kerja ekstra",
      icon:  Timer,
      color: { text: "text-blue-700", bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
    },
    {
      label: "Rata-rata Kehadiran",
      value: `${avgRate.toFixed(1)}%`,
      sub:   "dari hari kerja",
      icon:  TrendingUp,
      color: rateColor,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => <SummaryCard key={card.label} {...card} />)}
    </div>
  );
}

// ── Report table ──────────────────────────────────────────────────────────────
// 8 kolom — header dan sel sejajar per-kolom (left untuk teks, center untuk angka).

/** Definisi kolom: label + alignment untuk header & sel */
const TABLE_COLS = [
  { label: "Karyawan",   align: "left"   },
  { label: "Jabatan",    align: "left"   },
  { label: "Jadwal",     align: "center" },
  { label: "Hadir",      align: "center" },
  { label: "Absen",      align: "center" },
  { label: "Izin Resmi", align: "center" },
  { label: "Terlambat",  align: "center" },
  { label: "Rate",       align: "center" },
] as const;

function ReportTable({ rows }: { rows: AttendanceReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Tidak ada data untuk periode ini</p>
        <p className="text-xs text-muted-foreground mt-1">Pastikan karyawan memiliki jadwal terdaftar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {TABLE_COLS.map(({ label, align }) => (
              <th
                key={label}
                className={`px-4 py-3 text-${align} text-xs font-semibold text-muted-foreground uppercase tracking-wide`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => {
            const totalIzin = row.leaveDays + row.izinDays + row.sakitDays;
            const pelanggaranSub = [
              row.earlyLeaveDays > 0 ? `Plg cepat ${row.earlyLeaveDays}` : null,
              row.halfDays        > 0 ? `½ hari ${row.halfDays}`         : null,
            ].filter(Boolean).join(" · ");

            return (
              <tr
                key={row.employee.id}
                className={`hover:bg-primary/5 transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}
              >
                {/* Karyawan — left */}
                <td className="px-4 py-3 text-left">
                  <p className="font-semibold text-foreground">{row.employee.name}</p>
                  <p className="text-[11px] text-muted-foreground">{row.employee.employeeCode ?? "—"}</p>
                </td>

                {/* Jabatan — left */}
                <td className="px-4 py-3 text-left text-xs text-muted-foreground">{row.employee.role.name}</td>

                {/* Jadwal — center */}
                <td className="px-4 py-3 tabular-nums text-center">{row.scheduledDays}</td>

                {/* Hadir — center */}
                <td className="px-4 py-3 tabular-nums text-center font-semibold text-emerald-600">
                  {row.presentDays}
                </td>

                {/* Absen — center */}
                <td className="px-4 py-3 tabular-nums text-center">
                  {row.absentDays > 0
                    ? <span className="font-semibold text-red-600">{row.absentDays}</span>
                    : <span className="text-muted-foreground/50">0</span>}
                </td>

                {/* Izin Resmi — center, dengan breakdown kecil di bawah */}
                <td className="px-4 py-3 tabular-nums text-center">
                  <p className={totalIzin > 0 ? "font-semibold text-sky-600" : "text-muted-foreground/50"}>
                    {totalIzin}
                  </p>
                  {totalIzin > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      C {row.leaveDays} · I {row.izinDays} · S {row.sakitDays}
                    </p>
                  )}
                </td>

                {/* Terlambat — center, dengan sub-text plg-cepat/½hari */}
                <td className="px-4 py-3 tabular-nums text-center">
                  <p className={row.lateDays > 0 ? "font-semibold text-amber-600" : "text-muted-foreground/50"}>
                    {row.lateDays}
                  </p>
                  {pelanggaranSub && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pelanggaranSub}</p>
                  )}
                </td>

                {/* Rate — center */}
                <td className="px-4 py-3 text-center">
                  <RateBadge rate={row.attendanceRate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AttendanceReportPage() {
  const { branchId } = useAuthStore();
  const now = new Date();

  const [startDate, setStartDate] = useState<string>(() => getFirstOfMonth(now));
  const [endDate,   setEndDate]   = useState<string>(() => getLastOfMonth(now));
  const [search,    setSearch]    = useState("");

  // Bug 4 fix: client-side date validation before hitting the API
  const dateRangeError = startDate && endDate && endDate < startDate
    ? "Tanggal akhir tidak boleh sebelum tanggal mulai"
    : null;

  const { data, isLoading, isError, refetch } = useAttendanceReport(
    { branchId: branchId ?? "", startDate, endDate },
  );

  const rows = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.employee.name.toLowerCase().includes(q) ||
        (r.employee.employeeCode ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!branchId) {
    return (
      <PageContainer title="Laporan Kehadiran" subtitle="Rekap kehadiran karyawan per periode">
        <div className="flex h-60 items-center justify-center">
          <p className="text-sm text-muted-foreground">Pilih cabang terlebih dahulu.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Laporan Kehadiran"
      subtitle={
        data?.period
          ? `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`
          : "Rekap kehadiran karyawan per periode"
      }
    >
      <div className="space-y-5">

        {/* ── Filter panel ─────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Dari</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Sampai</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>

            {rows.length > 0 && !dateRangeError && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 ml-auto self-end"
                onClick={() => exportCSV(filtered, startDate, endDate)}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* ── Date range validation error (Bug 4 fix) ──────── */}
        {dateRangeError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dateRangeError}</span>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {isError && !dateRangeError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Gagal memuat laporan.</span>
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
            <span>Memuat laporan kehadiran…</span>
          </div>
        )}

        {/* ── Summary cards ─────────────────────────────────── */}
        {!isLoading && !isError && rows.length > 0 && (
          <SummaryCards rows={rows} />
        )}

        {/* ── Search bar ───────────────────────────────────── */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center gap-2">
            {/* FINDING-002 fix: was BarChart2 (chart icon), now Search */}
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cari karyawan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {filtered.length} karyawan
            </span>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        {!isLoading && !isError && !dateRangeError && (
          <ReportTable rows={filtered} />
        )}

      </div>
    </PageContainer>
  );
}
