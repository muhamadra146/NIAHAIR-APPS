import { useState } from "react";
import { TrendingUp, Receipt, Wallet, CalendarDays, Users, BadgeDollarSign } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useSummaryReport, useRevenueReport, useCommissionReport } from "../hooks";

const TABS = [
  { key: "summary",    label: "Ringkasan" },
  { key: "revenue",    label: "Pendapatan" },
  { key: "commissions", label: "Komisi" },
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
