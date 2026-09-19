import { useState, useMemo } from "react";
import { BarChart2, Download, Loader2, AlertCircle, User } from "lucide-react";
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
    "Hari Terjadwal", "Hadir", "Absen", "Terlambat",
    "Pulang Cepat", "Setengah Hari", "Menit Terlambat",
    "Menit Pulang Cepat", "Menit Lembur", "Kerja Hari Libur",
    "Tingkat Kehadiran (%)",
  ].join(",");

  const csvRows = rows.map((r) =>
    [
      r.employee.employeeCode ?? "",
      `"${r.employee.name}"`,
      `"${r.employee.role.name}"`,
      r.scheduledDays,
      r.presentDays,
      r.absentDays,
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

function SummaryCards({ rows }: { rows: AttendanceReportRow[] }) {
  const totalScheduled = rows.reduce((s, r) => s + r.scheduledDays, 0);
  const totalPresent   = rows.reduce((s, r) => s + r.presentDays,   0);
  const totalAbsent    = rows.reduce((s, r) => s + r.absentDays,    0);
  const totalLate      = rows.reduce((s, r) => s + r.lateDays,      0);
  const totalOvertime  = rows.reduce((s, r) => s + r.overtimeMinutes, 0);
  const avgRate        = rows.length
    ? rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length
    : 0;

  const cards = [
    { label: "Total Hadir",          value: `${totalPresent}/${totalScheduled}`, sub: "hari",       color: "text-emerald-600" },
    { label: "Total Absen",          value: totalAbsent,                         sub: "hari",       color: "text-red-600"     },
    { label: "Total Terlambat",      value: totalLate,                           sub: "hari",       color: "text-amber-600"   },
    { label: "Total Lembur",         value: fmtMinutes(totalOvertime),           sub: "",           color: "text-blue-600"    },
    { label: "Rata-rata Kehadiran",  value: `${avgRate.toFixed(1)}%`,            sub: "dari target", color: avgRate >= 95 ? "text-emerald-600" : avgRate >= 80 ? "text-amber-600" : "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ label, value, sub, color }) => (
        <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Report table ──────────────────────────────────────────────────────────────

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
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {[
              "Karyawan", "Jabatan", "Terjadwal", "Hadir", "Absen",
              "Terlambat", "Pulang Cepat", "Setengah Hari",
              "Mnt Terlambat", "Mnt Lembur", "Hari Libur Kerja", "Tingkat",
            ].map((h) => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.employee.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-3 whitespace-nowrap">
                <p className="font-semibold">{row.employee.name}</p>
                <p className="text-xs text-muted-foreground">{row.employee.employeeCode ?? "—"}</p>
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{row.employee.role.name}</td>
              <td className="px-3 py-3 tabular-nums text-center">{row.scheduledDays}</td>
              <td className="px-3 py-3 tabular-nums text-center text-emerald-600 font-medium">{row.presentDays}</td>
              <td className="px-3 py-3 tabular-nums text-center">
                {row.absentDays > 0
                  ? <span className="text-red-600 font-medium">{row.absentDays}</span>
                  : <span className="text-muted-foreground">0</span>}
              </td>
              <td className="px-3 py-3 tabular-nums text-center">
                {row.lateDays > 0
                  ? <span className="text-amber-600 font-medium">{row.lateDays}</span>
                  : <span className="text-muted-foreground">0</span>}
              </td>
              <td className="px-3 py-3 tabular-nums text-center">
                {row.earlyLeaveDays > 0
                  ? <span className="text-sky-600 font-medium">{row.earlyLeaveDays}</span>
                  : <span className="text-muted-foreground">0</span>}
              </td>
              <td className="px-3 py-3 tabular-nums text-center">
                {row.halfDays > 0
                  ? <span className="text-orange-600 font-medium">{row.halfDays}</span>
                  : <span className="text-muted-foreground">0</span>}
              </td>
              <td className="px-3 py-3 tabular-nums text-center text-xs">{fmtMinutes(row.lateMinutes)}</td>
              <td className="px-3 py-3 tabular-nums text-center text-xs">
                {row.overtimeMinutes > 0
                  ? <span className="text-blue-600">{fmtMinutes(row.overtimeMinutes)}</span>
                  : "—"}
              </td>
              <td className="px-3 py-3 tabular-nums text-center">
                {row.holidayWorkDays > 0
                  ? <span className="text-purple-600 font-medium">{row.holidayWorkDays}</span>
                  : <span className="text-muted-foreground">0</span>}
              </td>
              <td className="px-3 py-3">
                <RateBadge rate={row.attendanceRate} />
              </td>
            </tr>
          ))}
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

        {/* ── Filters ──────────────────────────────────────── */}
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

          {rows.length > 0 && (
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

        {/* ── Error ────────────────────────────────────────── */}
        {isError && (
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

        {/* ── Search ───────────────────────────────────────── */}
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground shrink-0" />
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
        {!isLoading && !isError && (
          <ReportTable rows={filtered} />
        )}

      </div>
    </PageContainer>
  );
}
