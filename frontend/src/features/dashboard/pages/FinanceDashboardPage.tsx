import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, ShoppingCart,
  BadgeDollarSign, Users, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { useFinanceDashboard } from "../hooks";

// ── Helpers ───────────────────────────────────────────────────────────────────

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style:    "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function getDefaultRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(now) };
}

function periodLabel(startDate: string, endDate: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const fmt = (d: string) => new Date(d).toLocaleDateString("id-ID", opts);
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleString("id-ID", { month: "short" })}`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:     string;
  value:     number;
  sub?:      string;
  color?:    "default" | "green" | "red" | "amber" | "blue";
  icon:      React.ElementType;
  trend?:    "up" | "down" | "neutral";
}

function KpiCard({ label, value, sub, color = "default", icon: Icon, trend }: KpiCardProps) {
  const colorMap = {
    default: "text-foreground",
    green:   "text-emerald-600",
    red:     "text-red-600",
    amber:   "text-amber-600",
    blue:    "text-blue-600",
  };
  const bgMap = {
    default: "bg-muted/40",
    green:   "bg-emerald-50 dark:bg-emerald-950/30",
    red:     "bg-red-50 dark:bg-red-950/30",
    amber:   "bg-amber-50 dark:bg-amber-950/30",
    blue:    "bg-blue-50 dark:bg-blue-950/30",
  };
  const iconMap = {
    default: "text-muted-foreground",
    green:   "text-emerald-500",
    red:     "text-red-500",
    amber:   "text-amber-500",
    blue:    "text-blue-500",
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase truncate">
              {label}
            </p>
            <p className={`text-xl font-bold mt-1 leading-none ${colorMap[color]}`}>
              {IDR(value)}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${bgMap[color]} ml-3 shrink-0`}>
            <Icon className={`h-5 w-5 ${iconMap[color]}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{IDR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Date range shortcuts ──────────────────────────────────────────────────────

const SHORTCUTS = [
  { label: "Bulan ini",    getValue: () => getDefaultRange() },
  {
    label: "7 hari",
    getValue: () => {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 6);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return { startDate: fmt(start), endDate: fmt(now) };
    },
  },
  {
    label: "30 hari",
    getValue: () => {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 29);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return { startDate: fmt(start), endDate: fmt(now) };
    },
  },
  {
    label: "Bulan lalu",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      return { startDate: fmt(start), endDate: fmt(end) };
    },
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FinanceDashboardPage() {
  const defaults = getDefaultRange();
  const [params, setParams] = useState({
    startDate: defaults.startDate,
    endDate:   defaults.endDate,
  });

  const { data, isLoading, isError, refetch, isFetching } =
    useFinanceDashboard(params);

  const chartData = useMemo(() => {
    return (data?.dailyTrend ?? []).map((d) => ({
      date:         formatShortDate(d.date),
      Revenue:      d.revenue,
      "Kas Masuk":  d.cashReceived,
    }));
  }, [data]);

  return (
    <PageContainer
      title="Finance Dashboard"
      subtitle={
        data
          ? periodLabel(params.startDate, params.endDate)
          : "Ringkasan keuangan per periode"
      }
      action={
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">

        {/* ── Period Selector ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {SHORTCUTS.map((s) => (
            <Button
              key={s.label}
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={() => setParams(s.getValue())}
            >
              {s.label}
            </Button>
          ))}

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={params.startDate}
              onChange={(e) => setParams((p) => ({ ...p, startDate: e.target.value }))}
              className="h-8 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <input
              type="date"
              value={params.endDate}
              onChange={(e) => setParams((p) => ({ ...p, endDate: e.target.value }))}
              className="h-8 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* ── Loading / Error ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
            <p className="text-sm font-medium text-destructive">Gagal memuat data keuangan</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
            </Button>
          </div>
        ) : data ? (
          <>
            {/* ── Row 1: Revenue + Cash + Purchases + Net Cash Flow ─────── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label="Total Revenue"
                value={data.revenue.total}
                sub={`${data.revenue.invoiceCount} invoice`}
                color="blue"
                icon={TrendingUp}
              />
              <KpiCard
                label="Kas Masuk"
                value={data.cashReceived.total}
                sub={`${data.cashReceived.paymentCount} pembayaran`}
                color="green"
                icon={Wallet}
              />
              <KpiCard
                label="Pembelian"
                value={data.purchases.total}
                sub={`${data.purchases.invoiceCount} PO`}
                color="amber"
                icon={ShoppingCart}
              />
              <KpiCard
                label="Net Cash Flow"
                value={data.netCashFlow}
                sub="Kas − Beli − Komisi − Gaji"
                color={data.netCashFlow >= 0 ? "green" : "red"}
                icon={data.netCashFlow >= 0 ? TrendingUp : TrendingDown}
                trend={data.netCashFlow >= 0 ? "up" : "down"}
              />
            </div>

            {/* ── Row 2: Commissions + Payroll + Outstanding ────────────── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <KpiCard
                label="Komisi (Approved + Paid)"
                value={data.commissions.total}
                sub={`${data.commissions.count} transaksi`}
                color="amber"
                icon={BadgeDollarSign}
              />
              <KpiCard
                label="Total Payroll (Paid)"
                value={data.payroll.total}
                sub={`${data.payroll.employeeCount} karyawan`}
                color="blue"
                icon={Users}
              />
              <KpiCard
                label="Invoice Belum Lunas"
                value={data.revenue.outstanding}
                sub={`${data.revenue.invoiceCount - data.revenue.paidCount} invoice`}
                color={data.revenue.outstanding > 0 ? "red" : "default"}
                icon={TrendingDown}
              />
            </div>

            {/* ── Detail breakdown ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* Revenue breakdown */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Revenue Breakdown
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Invoice</span>
                      <span className="font-semibold">{IDR(data.revenue.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sudah Lunas</span>
                      <span className="font-semibold text-emerald-600">{IDR(data.revenue.paidTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Belum Lunas</span>
                      <span className={`font-semibold ${data.revenue.outstanding > 0 ? "text-red-600" : ""}`}>
                        {IDR(data.revenue.outstanding)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid Invoice</span>
                      <span>{data.revenue.paidCount} / {data.revenue.invoiceCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Komisi breakdown */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Komisi Breakdown
                  </p>
                  <div className="space-y-2">
                    {["PENDING", "APPROVED", "PAID", "REJECTED"].map((s) => {
                      const row = data.commissions.byStatus[s];
                      if (!row) return null;
                      const colorCls =
                        s === "PAID"     ? "text-emerald-600" :
                        s === "APPROVED" ? "text-blue-600"    :
                        s === "REJECTED" ? "text-red-500"     :
                                           "text-amber-600";
                      return (
                        <div key={s} className="flex justify-between text-sm">
                          <span className={`font-medium capitalize ${colorCls}`}>{s}</span>
                          <span>
                            <span className="font-semibold">{IDR(row.amount)}</span>
                            <span className="text-muted-foreground ml-1 text-xs">({row.count})</span>
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Total (Approved+Paid)</span>
                      <span className="font-bold">{IDR(data.commissions.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payroll breakdown */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Payroll Breakdown (Paid)
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Income</span>
                      <span className="font-semibold">{IDR(data.payroll.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Potongan</span>
                      <span className="font-semibold text-red-600">{IDR(data.payroll.totalDeductions)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Salary</span>
                      <span className="font-bold text-emerald-600">{IDR(data.payroll.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Jumlah Payroll</span>
                      <span>{data.payroll.count} ({data.payroll.employeeCount} karyawan)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Daily Trend Chart ─────────────────────────────────────── */}
            {chartData.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Revenue vs Kas Masuk — Harian
                  </p>
                  <div className="w-full" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                        barCategoryGap="30%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            v >= 1_000_000
                              ? `${(v / 1_000_000).toFixed(0)}jt`
                              : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}rb`
                              : String(v)
                          }
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        />
                        <Bar
                          dataKey="Revenue"
                          fill="hsl(221 83% 53%)"
                          radius={[2, 2, 0, 0]}
                        />
                        <Bar
                          dataKey="Kas Masuk"
                          fill="hsl(142 76% 36%)"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Summary Footer ────────────────────────────────────────── */}
            <div className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Revenue: </span>
                <span className="font-semibold text-blue-600">{IDR(data.revenue.total)}</span>
              </div>
              <span className="text-muted-foreground">−</span>
              <div>
                <span className="text-muted-foreground">Pembelian: </span>
                <span className="font-semibold text-amber-600">{IDR(data.purchases.total)}</span>
              </div>
              <span className="text-muted-foreground">−</span>
              <div>
                <span className="text-muted-foreground">Komisi: </span>
                <span className="font-semibold">{IDR(data.commissions.total)}</span>
              </div>
              <span className="text-muted-foreground">−</span>
              <div>
                <span className="text-muted-foreground">Payroll: </span>
                <span className="font-semibold">{IDR(data.payroll.total)}</span>
              </div>
              <span className="text-muted-foreground">=</span>
              <div>
                <span className="text-muted-foreground">Net: </span>
                <span className={`font-bold ${data.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {IDR(data.netCashFlow)}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
