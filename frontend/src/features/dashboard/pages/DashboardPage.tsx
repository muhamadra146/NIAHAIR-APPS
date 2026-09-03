import { useState } from "react";
import { Link } from "react-router-dom";
import { StaffDashboardPage } from "./StaffDashboardPage";
import {
  TrendingUp, Receipt, Wallet, CalendarDays,
  Users, BadgeDollarSign, ArrowUpRight,
  ChevronRight, Banknote,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import { useSummaryReport } from "@/features/report/hooks";
import { useAppointments } from "@/features/appointment/hooks";
import { useLoans }        from "@/features/loan/hooks";
import { useDepositSummary } from "@/features/invoice/hooks";

// ── Date helpers (module-level, stable per page load) ────────────────────────
const _now      = new Date();
const todayStr  = _now.toISOString().slice(0, 10);

function getMondayStr(d: Date): string {
  const c   = new Date(d);
  const day = c.getDay(); // 0 = Sun
  c.setDate(c.getDate() - (day === 0 ? 6 : day - 1));
  return c.toISOString().slice(0, 10);
}

const firstDayStr = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString().slice(0, 10);
const lastDayStr  = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).toISOString().slice(0, 10);
const mondayStr   = getMondayStr(_now);

// ── Constants ─────────────────────────────────────────────────────────────────
const APPT_STATUS: Record<string, { label: string; color: string }> = {
  BOOKED:      { label: "Booked",     color: "text-slate-500"   },
  CONFIRMED:   { label: "Konfirmasi", color: "text-blue-500"    },
  CHECK_IN:    { label: "Check-in",   color: "text-violet-500"  },
  IN_PROGRESS: { label: "Proses",     color: "text-amber-500"   },
  COMPLETED:   { label: "Selesai",    color: "text-emerald-600" },
  CANCELLED:   { label: "Batal",      color: "text-rose-400"    },
  NO_SHOW:     { label: "No-show",    color: "text-gray-400"    },
};

const APPT_BADGE_CLASS: Record<string, string> = {
  BOOKED:      "bg-slate-100 text-slate-600",
  CONFIRMED:   "bg-blue-100 text-blue-600",
  CHECK_IN:    "bg-violet-100 text-violet-600",
  IN_PROGRESS: "bg-amber-100 text-amber-600",
  COMPLETED:   "bg-emerald-100 text-emerald-700",
  CANCELLED:   "bg-rose-100 text-rose-500",
  NO_SHOW:     "bg-gray-100 text-gray-500",
};

const STATUS_ORDER = ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"] as const;

type Period = "today" | "week" | "month";

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: "today", label: "Hari Ini"   },
  { value: "week",  label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini"  },
];

const KPI_CONFIG = [
  { icon: TrendingUp,      label: "Pendapatan",          href: "/reports"      },
  { icon: Receipt,         label: "Invoice Outstanding", href: "/invoices"     },
  { icon: Wallet,          label: "Deposit Masuk",       href: "/deposits"     },
  { icon: CalendarDays,    label: "Booking",             href: "/appointments" },
  { icon: BadgeDollarSign, label: "Komisi",              href: "/commissions"  },
  { icon: Users,           label: "Kasbon Aktif",        href: "/loans"        },
] as const;

const STAFF_ROLES = ["STAFF", "STYLIST"] as const;

// ── Page ──────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user, branchId } = useAuthStore();
  const [period, setPeriod] = useState<Period>("month");

  if (user?.roleCode && STAFF_ROLES.includes(user.roleCode as typeof STAFF_ROLES[number])) {
    return <StaffDashboardPage />;
  }

  // Period date ranges
  const periodDates: Record<Period, { startDate: string; endDate: string }> = {
    today: { startDate: todayStr,    endDate: todayStr    },
    week:  { startDate: mondayStr,   endDate: todayStr    },
    month: { startDate: firstDayStr, endDate: lastDayStr  },
  };

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: summary,      isLoading } = useSummaryReport({
    branchId: branchId ?? undefined,
    ...periodDates[period],
  });

  // Today summary always loaded independently for the "Ringkasan Hari Ini" row
  const { data: todaySummary, isLoading: todayLoading } = useSummaryReport({
    branchId:  branchId ?? undefined,
    startDate: todayStr,
    endDate:   todayStr,
  });

  const { data: depositSum  } = useDepositSummary({ branchId: branchId ?? undefined });
  const { data: todayAppts  } = useAppointments({ startDate: todayStr, endDate: todayStr, limit: 6 });
  const { data: activeLoans } = useLoans({ status: "ACTIVE", limit: 5 });

  // ── Derived values ──────────────────────────────────────────────────────────
  const todayApptList  = todayAppts?.appointments ?? [];
  const activeLoanList = activeLoans?.data ?? [];

  // Active deposit saldo (PAID + PARTIAL_USED)
  const depositSaldoCount = (depositSum?.PAID?.count ?? 0) + (depositSum?.PARTIAL_USED?.count ?? 0);
  const depositSaldoTotal = Number(depositSum?.PAID?.total ?? 0) + Number(depositSum?.PARTIAL_USED?.total ?? 0);

  // Period KPI values
  const totalInv      = summary?.invoices.total ?? 0;
  const paidInv       = summary?.invoices.paid ?? 0;
  const outstanding   = totalInv - paidInv;
  const paidPct       = totalInv > 0 ? Math.round((paidInv / totalInv) * 100) : 0;
  const totalAppt     = summary?.appointments.total ?? 0;
  const completedAppt = summary?.appointments.byStatus?.["COMPLETED"] ?? 0;
  const completedPct  = totalAppt > 0 ? Math.round((completedAppt / totalAppt) * 100) : 0;

  const kpiValues: { value: string; sub: string; progress?: number }[] = [
    { value: formatCurrency(summary?.invoices.totalRevenue ?? 0), sub: `${paidInv} invoice lunas`,        progress: paidPct      },
    { value: String(outstanding),                                  sub: `dari ${totalInv} total invoice` },
    { value: formatCurrency(summary?.deposits.totalAmount ?? 0),  sub: `${summary?.deposits.total ?? 0} transaksi` },
    { value: String(totalAppt),                                    sub: `${completedAppt} selesai`,        progress: completedPct },
    { value: formatCurrency(summary?.commissions.totalAmount ?? 0), sub: `${summary?.commissions.total ?? 0} entri` },
    { value: String(summary?.loans.active ?? 0),                   sub: "karyawan aktif" },
  ];

  // Greeting
  const greeting = (() => {
    const h = _now.getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  // Period label for display
  const periodLabel = period === "today"
    ? "Hari Ini"
    : period === "week"
      ? `Minggu Ini`
      : _now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Today's appointment status breakdown
  const todayByStatus      = todaySummary?.appointments?.byStatus ?? {};
  const activeTodayStatuses = STATUS_ORDER.filter((s) => (todayByStatus[s] ?? 0) > 0);

  const delays = ["delay-0","delay-50","delay-100","delay-150","delay-200","delay-250"] as const;

  return (
    <PageContainer>
      <div className="space-y-8">

        {/* ── Greeting ──────────────────────────────────────── */}
        <div className="animate-fade-in delay-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">
              {_now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
                {user?.name?.split(" ")[0]}
              </span>
            </h1>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <TrendingUp className="h-4 w-4 text-primary" />
            Lihat Laporan
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </div>

        {/* ── Ringkasan Hari Ini ─────────────────────────────── */}
        <section className="animate-fade-in delay-50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Ringkasan Hari Ini
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TodayCard
              icon={TrendingUp}
              iconClass="bg-emerald-100 text-emerald-600"
              label="Pendapatan"
              loading={todayLoading}
              value={formatCurrency(todaySummary?.invoices.totalRevenue ?? 0)}
              sub={`${todaySummary?.invoices.paid ?? 0} invoice lunas`}
            />
            <TodayCard
              icon={CalendarDays}
              iconClass="bg-violet-100 text-violet-600"
              label="Booking"
              loading={todayLoading}
              value={String(todaySummary?.appointments.total ?? 0)}
              sub={`${todaySummary?.appointments.byStatus?.["COMPLETED"] ?? 0} selesai`}
            />
            <TodayCard
              icon={Receipt}
              iconClass="bg-orange-100 text-orange-600"
              label="Invoice Outstanding"
              loading={todayLoading}
              value={String((todaySummary?.invoices.total ?? 0) - (todaySummary?.invoices.paid ?? 0))}
              sub={`dari ${todaySummary?.invoices.total ?? 0} invoice`}
            />
            <TodayCard
              icon={Wallet}
              iconClass="bg-rose-100 text-rose-600"
              label="Saldo Deposit Aktif"
              loading={false}
              value={formatCurrency(depositSaldoTotal)}
              sub={`${depositSaldoCount} deposit aktif`}
            />
          </div>
        </section>

        {/* ── KPI Grid with Period Toggle ────────────────────── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 animate-fade-in delay-100">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Performa · {periodLabel}
            </p>
            {/* Period toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {PERIOD_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    period === opt.value
                      ? "bg-white dark:bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {KPI_CONFIG.map((cfg, i) => {
                const v = kpiValues[i];
                return (
                  <MetricCard
                    key={cfg.label}
                    icon={cfg.icon}
                    label={cfg.label}
                    value={v.value}
                    sub={v.sub}
                    href={cfg.href}
                    progress={v.progress}
                    delay={delays[i]}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── Widgets ───────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Today Booking — with appointment status breakdown ── */}
          <WidgetCard
            title="Booking Hari Ini"
            subtitle={`${todayApptList.length} janji temu`}
            icon={CalendarDays}
            iconClass="bg-violet-100 text-violet-600"
            href="/appointments"
            delay="delay-200"
          >
            {/* Status breakdown badges */}
            {activeTodayStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-5 py-3 bg-muted/20">
                {activeTodayStatuses.map((s) => (
                  <span
                    key={s}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${APPT_BADGE_CLASS[s] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {APPT_STATUS[s]?.label ?? s}
                    <span className="font-bold">{todayByStatus[s]}</span>
                  </span>
                ))}
              </div>
            )}

            {todayApptList.length === 0 ? (
              <EmptyState icon={CalendarDays} text="Tidak ada booking hari ini" />
            ) : (
              todayApptList.map((appt, i) => {
                const st   = APPT_STATUS[appt.status] ?? { label: appt.status, color: "text-muted-foreground" };
                const time = new Date(appt.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                return (
                  <Link
                    key={appt.id}
                    to={`/appointments/${appt.id}`}
                    style={{ animationDelay: `${300 + i * 60}ms` }}
                    className="animate-fade-in flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100 text-violet-700 text-xs font-bold">
                      {(appt.customer?.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{appt.customer?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{time} · {appt.bookingNo}</p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${st.color}`}>{st.label}</span>
                  </Link>
                );
              })
            )}
          </WidgetCard>

          {/* Kasbon Aktif ──────────────────────────────────── */}
          <WidgetCard
            title="Kasbon Aktif"
            subtitle={`${activeLoanList.length} karyawan`}
            icon={Banknote}
            iconClass="bg-amber-100 text-amber-600"
            href="/loans"
            delay="delay-250"
          >
            {activeLoanList.length === 0 ? (
              <EmptyState icon={Users} text="Tidak ada kasbon aktif" />
            ) : (
              activeLoanList.map((loan, i) => {
                const pct = Number(loan.totalAmount) > 0
                  ? Math.round(((Number(loan.totalAmount) - Number(loan.remainingAmount)) / Number(loan.totalAmount)) * 100)
                  : 0;
                return (
                  <Link
                    key={loan.id}
                    to={`/loans/${loan.id}`}
                    style={{ animationDelay: `${300 + i * 60}ms` }}
                    className="animate-fade-in flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 text-xs font-bold">
                      {(loan.employee?.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{loan.employee?.name ?? "—"}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(loan.remainingAmount)}</p>
                      <p className="text-[11px] text-muted-foreground">sisa</p>
                    </div>
                  </Link>
                );
              })
            )}
          </WidgetCard>

        </div>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <section className="animate-fade-up delay-400">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Aksi Cepat</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: "Booking",   icon: CalendarDays,   href: "/appointments", gradient: "from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20", icon_c: "text-violet-600" },
              { label: "Invoice",   icon: Receipt,        href: "/invoices",     gradient: "from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20",     icon_c: "text-blue-600" },
              { label: "Deposit",   icon: Wallet,         href: "/deposits",     gradient: "from-rose-500/10 to-pink-500/10 hover:from-rose-500/20 hover:to-pink-500/20",         icon_c: "text-rose-500" },
              { label: "Kasbon",    icon: Banknote,       href: "/loans",        gradient: "from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20",   icon_c: "text-amber-600" },
              { label: "Laporan",   icon: TrendingUp,     href: "/reports",      gradient: "from-slate-500/10 to-slate-700/10 hover:from-slate-500/20 hover:to-slate-700/20",     icon_c: "text-slate-600" },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  to={a.href}
                  style={{ animationDelay: `${400 + i * 50}ms` }}
                  className={`animate-scale-in flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-gradient-to-br ${a.gradient} py-5 px-2 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group`}
                >
                  <Icon className={`h-5 w-5 ${a.icon_c} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </PageContainer>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WidgetCard({ title, subtitle, icon: Icon, iconClass, href, delay, children }: {
  title:     string;
  subtitle:  string;
  icon:      React.ElementType;
  iconClass: string;
  href:      string;
  delay:     string;
  children:  React.ReactNode;
}) {
  return (
    <div className={`animate-fade-up ${delay} rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Link to={href} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group">
          Lihat semua
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

function TodayCard({ icon: Icon, iconClass, label, loading, value, sub }: {
  icon:      React.ElementType;
  iconClass: string;
  label:     string;
  loading:   boolean;
  value:     string;
  sub:       string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24 rounded mb-1" />
      ) : (
        <p className="text-lg font-bold tracking-tight text-foreground truncate">{value}</p>
      )}
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
      <Icon className="h-7 w-7 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
