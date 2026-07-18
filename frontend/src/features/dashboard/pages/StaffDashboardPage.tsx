import { Link } from "react-router-dom";
import {
  CalendarDays, BadgeDollarSign, FileText, Banknote,
  Clock, CheckCircle2, AlertCircle, ChevronRight,
  KanbanSquare, CalendarRange,
} from "lucide-react";
import { Skeleton }            from "@/components/ui/skeleton";
import { Badge }               from "@/components/ui/badge";
import { PageContainer }       from "@/components/layout/PageContainer";
import { useAuthStore }        from "@/stores/authStore";
import { formatCurrency }      from "@/lib/utils";
import { useAppointments }     from "@/features/appointment/hooks";
import { useCommissions }      from "@/features/commission/hooks";
import { useMyPayrolls }       from "@/features/payroll/hooks/index";
import { useMyAttendanceToday } from "@/features/attendance/hooks";

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Derive current payroll period from the most recent payroll record. */
function useCurrentPeriod() {
  const { data } = useMyPayrolls({ limit: 1 });
  const latest = data?.data?.[0];
  if (latest) return { start: latest.periodStart, end: latest.periodEnd };
  // Fallback: current calendar month
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

// ── Status configs ─────────────────────────────────────────────────────────────

const APPT_STATUS: Record<string, { label: string; cls: string }> = {
  BOOKED:      { label: "Booked",     cls: "bg-slate-50 text-slate-600 border-slate-200"     },
  CONFIRMED:   { label: "Konfirmasi", cls: "bg-blue-50 text-blue-700 border-blue-200"        },
  CHECK_IN:    { label: "Check-in",   cls: "bg-violet-50 text-violet-700 border-violet-200"  },
  IN_PROGRESS: { label: "Proses",     cls: "bg-amber-50 text-amber-700 border-amber-200"     },
  COMPLETED:   { label: "Selesai",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED:   { label: "Batal",      cls: "bg-rose-50 text-rose-500 border-rose-200"        },
  NO_SHOW:     { label: "No-show",    cls: "bg-gray-50 text-gray-400 border-gray-200"        },
};

const QUICK_LINKS = [
  { label: "Booking Harian", href: "/booking-harian",  icon: KanbanSquare    },
  { label: "Komisi Saya",    href: "/my-commission",   icon: BadgeDollarSign },
  { label: "Slip Gaji",      href: "/my-payslip",      icon: FileText        },
  { label: "Kasbon Saya",    href: "/my-kasbon",       icon: Banknote        },
  { label: "Schedule",       href: "/schedule",        icon: CalendarRange   },
  { label: "Booking",        href: "/appointments",    icon: CalendarDays    },
];

// ── Components ────────────────────────────────────────────────────────────────

function AttendanceCard() {
  const { data, isLoading } = useMyAttendanceToday();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 min-h-[140px]">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-[140px]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kehadiran Hari Ini</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400">
          <Clock className="h-6 w-6 opacity-30" />
          <p className="text-sm">Tidak ada jadwal hari ini</p>
        </div>
      </div>
    );
  }

  const checkedIn  = !!data.attendance?.checkInAt;
  const checkedOut = !!data.attendance?.checkOutAt;
  const isLate     = data.attendance?.lateMinutes && data.attendance.lateMinutes > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm min-h-[140px]">
      <div className="flex items-center gap-1.5 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${checkedIn ? "bg-emerald-400" : "bg-amber-400"}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kehadiran Hari Ini</p>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          {data.shift && (
            <p className="text-sm font-semibold text-slate-800">
              Shift {data.shift.name} · {data.shift.startTime} – {data.shift.endTime}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Masuk: <span className="font-medium text-slate-700">{fmtTime(data.attendance?.checkInAt ?? null)}</span>
            </span>
            {checkedOut && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Keluar: <span className="font-medium text-slate-700">{fmtTime(data.attendance?.checkOutAt ?? null)}</span>
              </span>
            )}
          </div>
          {isLate && (
            <p className="text-xs text-amber-600 font-medium">Terlambat {data.attendance?.lateMinutes} menit</p>
          )}
        </div>
        <div className="shrink-0">
          {checkedIn ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Hadir
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3 w-3" /> Belum absen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CommissionPeriodCard() {
  const period   = useCurrentPeriod();
  const { data } = useCommissions({
    limit:      1000,
    startDate:  period.start,
    endDate:    period.end,
  });

  const items       = data?.data ?? [];
  const total       = items.reduce((s, c) => s + Number(c.commissionAmount), 0);
  const paid        = items.filter(c => c.status === "PAID").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const pending     = items.filter(c => c.status === "PENDING").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const isLoading   = !data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm min-h-[140px]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Komisi Periode Ini</p>
      </div>
      <p className="text-[10px] text-slate-400 mb-3">
        {fmtDate(period.start)} – {fmtDate(period.end)}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(total)}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-emerald-700 font-medium tabular-nums">
              Dibayar: {formatCurrency(paid)}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-amber-600 font-medium tabular-nums">
              Pending: {formatCurrency(pending)}
            </span>
          </div>
          <Link
            to="/my-commission"
            className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
          >
            Lihat detail <ChevronRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </div>
  );
}

function TodayAppointmentsCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useAppointments({
    employeeId,
    startDate: todayStr,
    endDate:   todayStr,
    limit:     10,
  });

  const appointments = data?.appointments ?? [];
  const done         = appointments.filter(a => a.status === "COMPLETED").length;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Appointment Hari Ini</p>
        </div>
        {appointments.length > 0 && (
          <span className="text-xs text-slate-400">{done}/{appointments.length} selesai</span>
        )}
      </div>

      {isLoading ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center gap-2">
          <CalendarDays className="h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">Tidak ada appointment hari ini</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {appointments.map((a) => {
            const cfg = APPT_STATUS[a.status] ?? APPT_STATUS.BOOKED;
            const time = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            return (
              <Link
                key={a.id}
                to={`/appointments/${a.id}`}
                className="flex items-center gap-4 px-5 py-3.5 group hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-mono text-slate-400 w-12 shrink-0 tabular-nums">{time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.customer.name}</p>
                  {a.branch && (
                    <p className="text-xs text-slate-400 truncate">{a.branch.name}</p>
                  )}
                </div>
                <Badge variant="outline" className={`text-xs rounded-lg shrink-0 ${cfg.cls}`}>{cfg.label}</Badge>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function StaffDashboardPage() {
  const { user } = useAuthStore();
  const name       = user?.employee?.name ?? user?.email ?? "";
  const employeeId = user?.employeeId ?? "";

  return (
    <PageContainer>
      <div className="space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()},{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              {name.split(" ")[0]}
            </span>
          </h1>
        </div>

        {/* Top row: Attendance + Commission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          <AttendanceCard />
          <CommissionPeriodCard />
        </div>

        {/* Today's appointments */}
        {employeeId && <TodayAppointmentsCard employeeId={employeeId} />}

        {/* Quick links */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Menu Cepat</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-2 py-5 text-center hover:border-primary/30 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110" />
                <span className="text-[11px] font-medium text-foreground/70 group-hover:text-foreground leading-tight transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
