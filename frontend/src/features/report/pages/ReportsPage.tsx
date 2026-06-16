import { useState } from "react";
import { TrendingUp, Receipt, Wallet, CalendarDays, Users, BadgeDollarSign, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useSummaryReport, useRevenueReport, useCommissionReport } from "../hooks";
import { useAttendanceReport } from "@/features/team/hooks";
import { useBpjsReport } from "@/features/payroll/hooks";

const TABS = [
  { key: "summary",     label: "Ringkasan" },
  { key: "revenue",     label: "Pendapatan" },
  { key: "commissions", label: "Komisi" },
  { key: "attendance",  label: "Kehadiran" },
  { key: "bpjs",        label: "BPJS" },
] as const;
type Tab = (typeof TABS)[number]["key"];

// Default: current month
const today     = new Date();
const firstDay  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const lastDay   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

export function ReportsPage() {
  const { branchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [startDate, setStart]     = useState(firstDay);
  const [endDate, setEnd]         = useState(lastDay);
  const [applied, setApplied]     = useState({ startDate: firstDay, endDate: lastDay });

  function applyFilter() {
    setApplied({ startDate, endDate });
  }

  const params = { branchId: branchId ?? undefined, ...applied };

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Laporan</h1>
          <p className="text-sm text-muted-foreground">Ringkasan data operasional dan keuangan</p>
        </div>

        {/* Date filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className="h-9 w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className="h-9 w-36" />
              </div>
              <Button size="sm" className="h-9" onClick={applyFilter}>Terapkan</Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => {
                setStart(firstDay); setEnd(lastDay);
                setApplied({ startDate: firstDay, endDate: lastDay });
              }}>Bulan Ini</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "summary"     && <SummaryTab params={params} />}
        {activeTab === "revenue"     && <RevenueTab params={params} />}
        {activeTab === "commissions" && <CommissionsTab params={applied} />}
        {activeTab === "attendance"  && <AttendanceTab branchId={branchId ?? undefined} startDate={applied.startDate} endDate={applied.endDate} />}
        {activeTab === "bpjs"        && <BpjsTab branchId={branchId ?? undefined} />}
      </div>
    </PageContainer>
  );
}

// ── Summary tab ───────────────────────────────────────────────────────────────

function SummaryTab({ params }: { params: Parameters<typeof useSummaryReport>[0] }) {
  const { data, isLoading } = useSummaryReport(params);

  if (isLoading) {
    return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  if (!data) return null;

  const apptByStatus = data.appointments.byStatus ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label="Total Invoice"
          value={String(data.invoices.total)}
          sub={`${data.invoices.paid} lunas`}
          color="text-blue-600"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Pendapatan"
          value={formatCurrency(data.invoices.totalRevenue)}
          sub="dari invoice lunas"
          color="text-green-600"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Deposit Masuk"
          value={formatCurrency(data.deposits.totalAmount)}
          sub={`${data.deposits.total} deposit`}
          color="text-primary"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Booking"
          value={String(data.appointments.total)}
          sub={`Selesai: ${apptByStatus["COMPLETED"] ?? 0} · Batal: ${apptByStatus["CANCELLED"] ?? 0}`}
          color="text-purple-600"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Kasbon Aktif"
          value={String(data.loans.active)}
          sub="karyawan memiliki kasbon"
          color="text-orange-600"
        />
        <StatCard
          icon={<BadgeDollarSign className="h-4 w-4" />}
          label="Total Komisi"
          value={formatCurrency(data.commissions.totalAmount)}
          sub={`${data.commissions.total} entri komisi`}
          color="text-yellow-600"
        />
      </div>

      {/* Appointment breakdown */}
      {Object.keys(apptByStatus).length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Booking per Status</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {Object.entries(apptByStatus).map(([status, count]) => {
                const pct = data.appointments.total > 0 ? Math.round((count / data.appointments.total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground capitalize">{status.toLowerCase().replace("_", " ")}</span>
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={`flex items-center gap-1.5 mb-2 ${color}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Revenue tab ───────────────────────────────────────────────────────────────

function RevenueTab({ params }: { params: Parameters<typeof useRevenueReport>[0] }) {
  const { data = [], isLoading } = useRevenueReport(params);

  const maxRevenue = data.length > 0 ? Math.max(...data.map((d) => Number(d.revenue))) : 1;
  const totalRevenue = data.reduce((sum, d) => sum + Number(d.revenue), 0);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data pendapatan untuk periode ini.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <Card>
        <CardContent className="pt-4 pb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Pendapatan ({data.length} hari)</span>
          <span className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
        </CardContent>
      </Card>

      {/* Bar chart (CSS) */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Pendapatan Harian</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            {data.map((d) => {
              const pct = maxRevenue > 0 ? Math.round((Number(d.revenue) / maxRevenue) * 100) : 0;
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{formatShortDate(d.date)}</span>
                  <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/80 rounded transition-all flex items-center pl-2" style={{ width: `${Math.max(pct, 2)}%` }}>
                      {pct > 20 && <span className="text-[10px] text-primary-foreground font-medium">{d.invoiceCount} inv</span>}
                    </div>
                  </div>
                  <span className="text-xs font-medium w-28 text-right shrink-0">{formatCurrency(d.revenue)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Invoice</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.date} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{formatShortDate(d.date)}</td>
                    <td className="px-4 py-2.5 text-right">{d.invoiceCount}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700">{formatCurrency(d.revenue)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right">{data.reduce((s, d) => s + d.invoiceCount, 0)}</td>
                  <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function fmtMinutes(min: number) {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// ── Attendance tab ────────────────────────────────────────────────────────────

function AttendanceTab({
  branchId, startDate, endDate,
}: { branchId?: string; startDate: string; endDate: string }) {
  const { data, isLoading } = useAttendanceReport({
    branchId,
    startDate,
    endDate,
  });

  if (!branchId) {
    return (
      <div className="flex flex-col items-center py-14 text-center gap-2">
        <ClipboardList className="h-9 w-9 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Pilih cabang untuk melihat laporan kehadiran</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const rows = data?.data ?? [];

  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data kehadiran untuk periode ini.</p>;
  }

  // Totals
  const totScheduled   = rows.reduce((s, r) => s + r.scheduledDays,    0);
  const totPresent     = rows.reduce((s, r) => s + r.presentDays,      0);
  const totAbsent      = rows.reduce((s, r) => s + r.absentDays,       0);
  const totLate        = rows.reduce((s, r) => s + r.lateDays,         0);
  const totOvertime    = rows.reduce((s, r) => s + r.overtimeMinutes,   0);
  const avgRate        = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length * 10) / 10
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Hari Hadir",       value: String(totPresent),        sub: `dari ${totScheduled} jadwal`,  color: "text-emerald-600" },
          { label: "Hari Absen",       value: String(totAbsent),         sub: "tidak hadir",                   color: "text-red-500"     },
          { label: "Terlambat",        value: String(totLate),           sub: "hari terlambat masuk",          color: "text-amber-600"   },
          { label: "Rata-rata Hadir",  value: `${avgRate}%`,             sub: "tingkat kehadiran",             color: "text-blue-600"    },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-employee table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Detail per Karyawan ({rows.length} orang)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Karyawan</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Jadwal</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">Hadir</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-red-600">Absen</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-amber-600">Terlambat</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">Pulang Cepat</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">Lembur</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-blue-700">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const rateCls = r.attendanceRate >= 90
                    ? "text-emerald-600"
                    : r.attendanceRate >= 75
                    ? "text-amber-600"
                    : "text-red-500";

                  return (
                    <tr key={r.employee.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{r.employee.name}</p>
                        <p className="text-xs text-muted-foreground">{r.employee.role.name}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-sm">{r.scheduledDays}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-emerald-600">{r.presentDays}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-red-500">{r.absentDays > 0 ? r.absentDays : <span className="text-muted-foreground/40">0</span>}</td>
                      <td className="px-3 py-3 text-center text-sm">
                        {r.lateDays > 0
                          ? <span className="text-amber-600 font-medium">{r.lateDays}<span className="text-xs text-muted-foreground ml-1">({fmtMinutes(r.lateMinutes)})</span></span>
                          : <span className="text-muted-foreground/40">0</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {r.earlyLeaveDays > 0 ? `${r.earlyLeaveDays} (${fmtMinutes(r.earlyLeaveMinutes)})` : <span className="text-muted-foreground/40">0</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {r.overtimeMinutes > 0 ? fmtMinutes(r.overtimeMinutes) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className={`px-3 py-3 text-right text-sm font-bold ${rateCls}`}>
                        {r.attendanceRate}%
                      </td>
                    </tr>
                  );
                })}
                {/* Footer totals */}
                <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                  <td className="px-4 py-2.5 text-xs">Total / Rata-rata</td>
                  <td className="px-3 py-2.5 text-center text-xs">{totScheduled}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-emerald-600">{totPresent}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-red-500">{totAbsent}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-amber-600">{totLate}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{rows.reduce((s, r) => s + r.earlyLeaveDays, 0)}</td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{fmtMinutes(totOvertime)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-blue-700">{avgRate}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Commissions tab ───────────────────────────────────────────────────────────

function CommissionsTab({ params }: { params: Parameters<typeof useCommissionReport>[0] }) {
  const { data = [], isLoading } = useCommissionReport(params);

  const grand = data.reduce((s, r) => s + Number(r.totalAmount), 0);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data komisi untuk periode ini.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Komisi ({data.length} karyawan)</span>
          <span className="text-2xl font-bold text-yellow-600">{formatCurrency(grand)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Karyawan</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pending</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Disetujui</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Dibayar</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.employeeId} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.employee?.name ?? "—"}</p>
                      {r.employee?.employeeCode && <p className="text-xs text-muted-foreground">{r.employee.employeeCode}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(r.pending)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(r.approved)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(r.paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right text-yellow-600">{formatCurrency(data.reduce((s, r) => s + Number(r.pending), 0))}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{formatCurrency(data.reduce((s, r) => s + Number(r.approved), 0))}</td>
                  <td className="px-4 py-2.5 text-right text-green-600">{formatCurrency(data.reduce((s, r) => s + Number(r.paid), 0))}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(grand)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── BPJS tab ──────────────────────────────────────────────────────────────────

function BpjsTab({ branchId }: { branchId?: string }) {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearMonth, setYearMonth] = useState(thisMonth);

  const { data, isLoading } = useBpjsReport({ branchId, yearMonth });

  if (!branchId) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Pilih cabang untuk melihat laporan BPJS.</p>
    );
  }

  const rows   = data?.data    ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      {/* Month picker (independent from global date range) */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Bulan Penggajian</span>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Menampilkan payroll status <span className="font-semibold">Disetujui</span> dan <span className="font-semibold">Dibayar</span>
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data payroll untuk bulan ini.</p>
      ) : (
        <>
          {/* Summary cards */}
          {totals && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Gaji Pokok", value: fmtRp(totals.baseSalary), color: "text-slate-700" },
                { label: "Total JHT (Tk.)", value: fmtRp(totals.bpjsJht),    color: "text-blue-600"  },
                { label: "Total JP (Tk.)",  value: fmtRp(totals.bpjsJp),     color: "text-indigo-600"},
                { label: "Total BPJS",      value: fmtRp(totals.totalBpjs),  color: "text-purple-700"},
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-base font-bold tabular-nums leading-tight mt-1 ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Detail table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Karyawan</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gaji Pokok</th>
                      <th className="px-4 py-2.5 text-right font-medium text-blue-700">JHT (Tk.)</th>
                      <th className="px-4 py-2.5 text-right font-medium text-indigo-700">JP (Tk.)</th>
                      <th className="px-4 py-2.5 text-right font-medium text-purple-700">Total BPJS</th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.employee.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.employee.name}</p>
                          {r.employee.employeeCode && <p className="text-xs text-muted-foreground">{r.employee.employeeCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmtRp(r.baseSalary)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-blue-600">{fmtRp(r.bpjsJht)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-indigo-600">{fmtRp(r.bpjsJp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-purple-700">{fmtRp(r.totalBpjs)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>{r.status === "PAID" ? "Dibayar" : "Disetujui"}</span>
                        </td>
                      </tr>
                    ))}
                    {totals && (
                      <tr className="bg-muted/50 font-semibold">
                        <td className="px-4 py-2.5">Total ({rows.length} karyawan)</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtRp(totals.baseSalary)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-blue-600">{fmtRp(totals.bpjsJht)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-indigo-600">{fmtRp(totals.bpjsJp)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-purple-700">{fmtRp(totals.totalBpjs)}</td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
