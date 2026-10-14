import { toWibDateStr, wibDateParts, wibMonthRange, addDaysToDateStr, WIB_TZ } from "@/lib/utils";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, ShoppingCart, BadgeDollarSign, Users,
  RefreshCw, Loader2, ChevronRight, AlertTriangle, Receipt, PiggyBank,
} from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { useAllBranches }    from "@/features/settings/hooks";
import { useFinanceDashboard } from "../hooks";
import { useFinanceFilters, ALL_BRANCHES } from "../filters";

// ── Helpers ───────────────────────────────────────────────────────────────────

export const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style:    "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function periodLabel(startDate: string, endDate: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric", timeZone: WIB_TZ };
  const fmt = (d: string) => new Date(d).toLocaleDateString("id-ID", opts);
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: WIB_TZ });
}

// ── KPI Card (bisa diklik ke datanya) ────────────────────────────────────────

type CardColor = "default" | "green" | "red" | "amber" | "blue" | "violet";

interface KpiCardProps {
  label:  string;
  value:  number;
  sub?:   string;
  color?: CardColor;
  icon:   React.ElementType;
  to:     string;
}

const COLOR = {
  default: { text: "text-foreground",  bg: "bg-muted/40",                          icon: "text-muted-foreground" },
  green:   { text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-500" },
  red:     { text: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30",         icon: "text-red-500" },
  amber:   { text: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",     icon: "text-amber-500" },
  blue:    { text: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30",       icon: "text-blue-500" },
  violet:  { text: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/30",   icon: "text-violet-500" },
} satisfies Record<CardColor, { text: string; bg: string; icon: string }>;

function KpiCard({ label, value, sub, color = "default", icon: Icon, to }: KpiCardProps) {
  const c = COLOR[color];
  return (
    <Link to={to} className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="relative h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase leading-snug">{label}</p>
              <p className={`text-xl font-bold mt-1 leading-none ${c.text}`}>{IDR(value)}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            <div className={`p-2 rounded-lg ${c.bg} ml-3 shrink-0`}>
              <Icon className={`h-5 w-5 ${c.icon}`} />
            </div>
          </div>
          <p className="mt-2 flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
            Lihat data <ChevronRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Line({ label, value, strong, negative, className = "" }: {
  label: string; value: number; strong?: boolean; negative?: boolean; className?: string;
}) {
  return (
    <div className={`flex justify-between gap-3 text-sm ${className}`}>
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`${strong ? "font-bold" : "font-semibold"} ${negative ? "text-red-600" : ""}`}>
        {negative && value > 0 ? "− " : ""}{IDR(value)}
      </span>
    </div>
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
  { label: "Bulan ini", getValue: () => ({ startDate: wibMonthRange().start, endDate: toWibDateStr() }) },
  {
    label: "7 hari",
    getValue: () => {
      const today = toWibDateStr();
      return { startDate: addDaysToDateStr(today, -6), endDate: today };
    },
  },
  {
    label: "30 hari",
    getValue: () => {
      const today = toWibDateStr();
      return { startDate: addDaysToDateStr(today, -29), endDate: today };
    },
  },
  {
    label: "Bulan lalu",
    getValue: () => {
      const { year, month } = wibDateParts();
      const { start, end } = wibMonthRange(year, month - 1);
      return { startDate: start, endDate: end };
    },
  },
];

/** Periode & cabang — dipakai juga di halaman rincian */
export function FinanceFilterBar() {
  const { startDate, endDate, branch, setFilters } = useFinanceFilters();
  const { data: branches = [] } = useAllBranches();
  const inputCls = "h-8 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SHORTCUTS.map((s) => (
        <Button key={s.label} size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => setFilters(s.getValue())}>
          {s.label}
        </Button>
      ))}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <select value={branch} onChange={(e) => setFilters({ branch: e.target.value })} className={inputCls} aria-label="Cabang">
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          <option value={ALL_BRANCHES}>Semua cabang</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setFilters({ startDate: e.target.value })} className={inputCls} aria-label="Dari tanggal" />
        <span className="text-muted-foreground text-sm">–</span>
        <input type="date" value={endDate} onChange={(e) => setFilters({ endDate: e.target.value })} className={inputCls} aria-label="Sampai tanggal" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FinanceDashboardPage() {
  const { startDate, endDate, apiParams, query } = useFinanceFilters();
  const { data, isLoading, isError, refetch, isFetching } = useFinanceDashboard(apiParams);

  const incomeLink   = `/finance/rincian?jenis=pendapatan&${query}`;
  const purchaseLink = `/finance/rincian?jenis=pembelian&${query}`;
  const dateQuery    = new URLSearchParams({ startDate, endDate }).toString();

  const chartData = useMemo(() => (data?.dailyTrend ?? []).map((d) => ({
    date:                   formatShortDate(d.date),
    "Kotor":                d.gross,
    "Bersih setelah komisi": d.netAfter,
  })), [data]);

  return (
    <PageContainer
      title="Dashboard Keuangan"
      subtitle={periodLabel(startDate, endDate)}
      action={
        <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <FinanceFilterBar />

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
            {/* ── Row 1: Pendapatan + Pembelian ───────────────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Pendapatan Kotor"
                value={data.income.gross}
                sub={`Uang masuk dari client · ${data.income.breakdown.invoicePaymentCount + data.income.breakdown.depositPaymentCount} pembayaran`}
                color="blue" icon={Wallet} to={incomeLink}
              />
              <KpiCard
                label="Bersih Sebelum Komisi"
                value={data.income.netBefore}
                sub="Kotor − PPN − Ongkos PP − bagian tim"
                color="green" icon={TrendingUp} to={incomeLink}
              />
              <KpiCard
                label="Bersih Setelah Komisi"
                value={data.income.netAfter}
                sub={`Setelah komisi staf ${IDR(data.income.deductions.commission)}`}
                color="violet" icon={PiggyBank} to={incomeLink}
              />
              <KpiCard
                label="Pembelian Gudang"
                value={data.purchases.total}
                sub={`${data.purchases.invoiceCount} faktur · ${data.purchases.warehouses.join(", ") || "belum ada gudang terhubung"}`}
                color="amber" icon={ShoppingCart} to={purchaseLink}
              />
            </div>

            {data.income.commissionPendingInvoices > 0 && (
              <Link
                to="/generate-komisi"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <b>{data.income.commissionPendingInvoices} invoice</b> belum diisi Input Pekerjaan, jadi komisi staf dan bagian tim Home Service-nya
                  belum ikut mengurangi pendapatan bersih. Klik untuk mengisi.
                </span>
              </Link>
            )}

            {/* ── Row 2: Piutang, Komisi, Gaji, Arus Kas ──────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Invoice Belum Lunas"
                value={data.invoices.outstanding}
                sub={`${data.invoices.invoiceCount - data.invoices.paidCount} dari ${data.invoices.invoiceCount} invoice terbit`}
                color={data.invoices.outstanding > 0 ? "red" : "default"}
                icon={Receipt} to={`/invoices?${dateQuery}`}
              />
              <KpiCard
                label="Komisi (Disetujui + Dibayar)"
                value={data.commissions.total}
                sub={`${data.commissions.count} komisi`}
                color="amber" icon={BadgeDollarSign} to={`/commissions?${dateQuery}`}
              />
              <KpiCard
                label="Gaji Dibayar"
                value={data.payroll.total}
                sub={`${data.payroll.employeeCount} karyawan`}
                color="blue" icon={Users} to="/payroll"
              />
              <KpiCard
                label="Arus Kas Bersih"
                value={data.netCashFlow}
                sub="Kotor − Pembelian − Komisi − Gaji"
                color={data.netCashFlow >= 0 ? "green" : "red"}
                icon={data.netCashFlow >= 0 ? TrendingUp : TrendingDown}
                to={incomeLink}
              />
            </div>

            {/* ── Rincian ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dari Kotor ke Bersih</p>
                  <div className="space-y-2">
                    <Line label="Pendapatan kotor" value={data.income.gross} strong />
                    <Line label="PPN" value={data.income.deductions.tax} negative />
                    <Line label="Ongkos PP" value={data.income.deductions.ongkosPP} negative />
                    <Line label="50% Charge Lembur (tim)" value={data.income.deductions.lemburTeam} negative />
                    <Line label="Tim Home Service" value={data.income.deductions.hsTeam} negative />
                    <Line label="Bersih sebelum komisi" value={data.income.netBefore} strong className="border-t pt-2" />
                    <Line label="Komisi staf" value={data.income.deductions.commission} negative />
                    <Line label="Bersih setelah komisi" value={data.income.netAfter} strong className="border-t pt-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sumber Uang Masuk</p>
                  <div className="space-y-2">
                    <Line label={`Pembayaran invoice (${data.income.breakdown.invoicePaymentCount})`} value={data.income.breakdown.invoicePayments} />
                    <Line label={`Pembayaran DP (${data.income.breakdown.depositPaymentCount})`} value={data.income.breakdown.depositPayments} />
                    <Line label={`DP dikembalikan (${data.income.breakdown.refundCount})`} value={data.income.breakdown.refunds} negative />
                    <Line label="Pendapatan kotor" value={data.income.gross} strong className="border-t pt-2" />
                    <p className="pt-1 text-xs text-muted-foreground">
                      Bagian invoice yang dibayar pakai DP tidak dihitung lagi — DP sudah masuk saat dibayar client.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Komisi per Status</p>
                  <div className="space-y-2">
                    {([["PENDING", "Menunggu", "text-amber-600"], ["APPROVED", "Disetujui", "text-blue-600"],
                       ["PAID", "Dibayar", "text-emerald-600"], ["REJECTED", "Ditolak", "text-red-500"]] as const).map(([s, label, cls]) => {
                      const row = data.commissions.byStatus[s];
                      if (!row) return null;
                      return (
                        <div key={s} className="flex justify-between text-sm">
                          <span className={`font-medium ${cls}`}>{label}</span>
                          <span>
                            <span className="font-semibold">{IDR(row.amount)}</span>
                            <span className="text-muted-foreground ml-1 text-xs">({row.count})</span>
                          </span>
                        </div>
                      );
                    })}
                    <Line label="Disetujui + dibayar" value={data.commissions.total} strong className="border-t pt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Grafik harian ───────────────────────────────────────────── */}
            {chartData.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Pendapatan Kotor vs Bersih — Harian
                  </p>
                  <div className="w-full" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis
                          tickFormatter={(v) =>
                            Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt`
                            : Math.abs(v) >= 1_000   ? `${(v / 1_000).toFixed(0)}rb`
                            : String(v)}
                          tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="Kotor" fill="hsl(221 83% 53%)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Bersih setelah komisi" fill="hsl(262 83% 58%)" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
