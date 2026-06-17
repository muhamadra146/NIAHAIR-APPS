import { Link } from "react-router-dom";
import {
  TrendingUp, Receipt, Wallet, CalendarDays,
  Users, BadgeDollarSign, ArrowUpRight,
  Scissors, ChevronRight, Banknote,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import { useSummaryReport } from "@/features/report/hooks";
import { useAppointments }  from "@/features/appointment/hooks";
import { useLoans }         from "@/features/loan/hooks";

const today    = new Date();
const todayStr = today.toISOString().slice(0, 10);
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

const APPT_STATUS: Record<string, { label: string; color: string }> = {
  BOOKED:      { label: "Booked",     color: "text-slate-500"   },
  CONFIRMED:   { label: "Konfirmasi", color: "text-blue-500"    },
  CHECK_IN:    { label: "Check-in",   color: "text-violet-500"  },
  IN_PROGRESS: { label: "Proses",     color: "text-amber-500"   },
  COMPLETED:   { label: "Selesai",    color: "text-emerald-600" },
  CANCELLED:   { label: "Batal",      color: "text-rose-400"    },
  NO_SHOW:     { label: "No-show",    color: "text-gray-400"    },
};

const KPI_CONFIG = [
  { icon: TrendingUp,      label: "Pendapatan",   href: "/reports"      },
  { icon: Receipt,         label: "Total Invoice", href: "/invoices"     },
  { icon: Wallet,          label: "Deposit Masuk", href: "/deposits"     },
  { icon: CalendarDays,    label: "Booking",       href: "/appointments" },
  { icon: BadgeDollarSign, label: "Komisi",        href: "/commissions"  },
  { icon: Users,           label: "Kasbon Aktif",  href: "/loans"        },
] as const;

export function DashboardPage() {
  const { user, branchId } = useAuthStore();

  const { data: summary, isLoading } = useSummaryReport({
    branchId:  branchId ?? undefined,
    startDate: firstDay,
    endDate:   lastDay,
  });
  const { data: todayAppts }  = useAppointments({ startDate: todayStr, endDate: todayStr, limit: 6 });
  const { data: activeLoans } = useLoans({ status: "ACTIVE", limit: 5 });

  const todayApptList  = todayAppts?.appointments ?? [];
  const activeLoanList = activeLoans?.data ?? [];

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const monthLabel    = today.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const totalAppt     = summary?.appointments.total ?? 0;
  const completedAppt = summary?.appointments.byStatus?.["COMPLETED"] ?? 0;
  const completedPct  = totalAppt > 0 ? Math.round((completedAppt / totalAppt) * 100) : 0;
  const totalInv      = summary?.invoices.total ?? 0;
  const paidInv       = summary?.invoices.paid ?? 0;
  const paidPct       = totalInv > 0 ? Math.round((paidInv / totalInv) * 100) : 0;

  const kpiValues: { value: string; sub: string; progress?: number }[] = [
    { value: formatCurrency(summary?.invoices.totalRevenue ?? 0), sub: `${paidInv} invoice lunas`,  progress: paidPct },
    { value: String(totalInv),                                    sub: `${totalInv - paidInv} outstanding` },
    { value: formatCurrency(summary?.deposits.totalAmount ?? 0),  sub: `${summary?.deposits.total ?? 0} transaksi` },
    { value: String(totalAppt),                                   sub: `${completedAppt} selesai`,  progress: completedPct },
    { value: formatCurrency(summary?.commissions.totalAmount ?? 0), sub: `${summary?.commissions.total ?? 0} entri` },
    { value: String(summary?.loans.active ?? 0),                  sub: "karyawan aktif" },
  ];

  const delays = ["delay-0","delay-50","delay-100","delay-150","delay-200","delay-250"];

  return (
    <PageContainer>
      <div className="space-y-8">

        {/* ── Greeting ──────────────────────────────────────── */}
        <div className="animate-fade-in delay-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">
              {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
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

        {/* ── KPI Grid ──────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 animate-fade-in delay-50">
            Performa Bulan Ini · {monthLabel}
          </p>

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
          <WidgetCard
            title="Booking Hari Ini"
            subtitle={`${todayApptList.length} janji temu`}
            icon={CalendarDays}
            iconClass="bg-violet-100 text-violet-600"
            href="/appointments"
            delay="delay-200"
          >
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
              { label: "Treatment", icon: Scissors,       href: "/treatments",   gradient: "from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20",   icon_c: "text-teal-600" },
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

// ── Widget Card ───────────────────────────────────────────────────────────────

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

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
      <Icon className="h-7 w-7 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
