import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft, Pencil, RefreshCw, Clock, CalendarDays,
  CalendarClock, Ban, User, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAppointment, useUpdateAppointment, useChangeAppointmentStatus } from "../hooks";
import { AppointmentDetailView } from "../components/AppointmentDetailView";
import { AppointmentUpdateForm } from "../components/AppointmentForm";
import { AppointmentStatusDialog } from "../components/AppointmentStatusDialog";
import { AppointmentStatusBadge } from "../components/AppointmentStatusBadge";
import type { UpdateAppointmentFormValues, ChangeStatusFormValues } from "../schemas/appointment.schema";
import type { Appointment, AppointmentRescheduleHistory, AppointmentStatusHistory } from "../types";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"] as const;

// ── History timeline ──────────────────────────────────────────────────

const STATUS_ICON: Partial<Record<string, JSX.Element>> = {
  BOOKED:      <CalendarDays className="h-3.5 w-3.5" />,
  CONFIRMED:   <CheckCircle  className="h-3.5 w-3.5" />,
  CHECK_IN:    <CheckCircle  className="h-3.5 w-3.5" />,
  IN_PROGRESS: <Clock        className="h-3.5 w-3.5" />,
  COMPLETED:   <CheckCircle  className="h-3.5 w-3.5" />,
  CANCELLED:   <XCircle      className="h-3.5 w-3.5" />,
  NO_SHOW:     <AlertCircle  className="h-3.5 w-3.5" />,
};

const STATUS_COLOR: Partial<Record<string, string>> = {
  BOOKED:      "bg-rose-50 text-rose-600 border-rose-200",
  CONFIRMED:   "bg-blue-50 text-blue-600 border-blue-200",
  CHECK_IN:    "bg-violet-50 text-violet-600 border-violet-200",
  IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-200",
  COMPLETED:   "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED:   "bg-red-50 text-red-600 border-red-200",
  NO_SHOW:     "bg-slate-50 text-slate-600 border-slate-200",
};

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toHHMM(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function HistoryTimeline({ appointment }: { appointment: Appointment }) {
  type TimelineEvent =
    | { kind: "status";     ts: string; entry: AppointmentStatusHistory }
    | { kind: "reschedule"; ts: string; entry: AppointmentRescheduleHistory };

  const events: TimelineEvent[] = [
    ...appointment.statusHistories.map((e) => ({ kind: "status" as const, ts: e.createdAt, entry: e })),
    ...(appointment.rescheduleHistories ?? []).map((e) => ({ kind: "reschedule" as const, ts: e.createdAt, entry: e })),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">Belum ada riwayat.</p>;
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-6 pl-6">
      {events.map((ev, i) => {
        if (ev.kind === "status") {
          const h    = ev.entry as AppointmentStatusHistory;
          const icon = STATUS_ICON[h.newStatus] ?? <Clock className="h-3.5 w-3.5" />;
          const cls  = STATUS_COLOR[h.newStatus] ?? "bg-slate-50 text-slate-600 border-slate-200";
          return (
            <li key={i} className="relative">
              <span className={`absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full border ${cls}`}>
                {icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {h.oldStatus ? `${h.oldStatus} → ${h.newStatus}` : `Booking dibuat · ${h.newStatus}`}
                </p>
                {h.notes && <p className="text-xs text-slate-500 mt-0.5 italic">"{h.notes}"</p>}
                {h.newStatus === "CANCELLED" && appointment.cancelReason && (
                  <p className="text-xs text-red-600 mt-0.5">
                    Alasan: {appointment.cancelReason}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">{formatDt(h.createdAt)}</p>
              </div>
            </li>
          );
        }

        const r = ev.entry as AppointmentRescheduleHistory;
        return (
          <li key={i} className="relative">
            <span className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full border bg-indigo-50 text-indigo-600 border-indigo-200">
              <CalendarClock className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Reschedule</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Dari: {formatDate(r.oldVisitDate)}, {toHHMM(r.oldStartTime)}–{toHHMM(r.oldEndTime)}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Ke: {formatDate(r.newVisitDate)}, {toHHMM(r.newStartTime)}–{toHHMM(r.newEndTime)}
              </p>
              {r.reason && (
                <p className="text-xs text-slate-500 mt-0.5 italic">Alasan: "{r.reason}"</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{formatDt(r.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Cancel info banner ────────────────────────────────────────────────

function CancelledBanner({ appointment }: { appointment: Appointment }) {
  if (appointment.status !== "CANCELLED") return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 space-y-1">
      <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
        <XCircle className="h-4 w-4 shrink-0" />
        Booking Dibatalkan
      </div>
      {appointment.cancelReason && (
        <p className="text-sm text-red-600">Alasan: {appointment.cancelReason}</p>
      )}
      {appointment.cancelledAt && (
        <p className="text-xs text-red-400">{formatDt(appointment.cancelledAt)}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

type Tab = "detail" | "history";

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: appointment, isLoading, isError } = useAppointment(id!);
  const updateMutation = useUpdateAppointment(id!);
  const statusMutation = useChangeAppointmentStatus(id!);

  const [activeTab, setActiveTab]   = useState<Tab>("detail");
  const [editOpen, setEditOpen]     = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function handleUpdate(values: UpdateAppointmentFormValues) {
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        visitDate:          values.visitDate          || undefined,
        startTime:          values.startTime          || undefined,
        endTime:            values.endTime            || undefined,
        type:               values.type,
        homeServiceAddress: values.homeServiceAddress || undefined,
        notes:              values.notes              || undefined,
        estimatedTotal:     values.estimatedTotal,
      });
      setEditOpen(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleStatusChange(values: ChangeStatusFormValues) {
    setStatusError(null);
    try {
      await statusMutation.mutateAsync({
        status: values.status,
        notes:  values.notes || undefined,
      });
      setStatusOpen(false);
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !appointment) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Appointment not found.{" "}
          <Link to="/appointments" className="text-primary underline">
            Back to list
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(appointment.status);
  const rescheduleCount = (appointment.rescheduleHistories ?? []).length;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/appointments">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {appointment.customer.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs">{appointment.bookingNo}</span>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {!isTerminal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStatusError(null); setStatusOpen(true); }}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Status
                </Button>
              )}
              {appointment.status !== "CANCELLED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditError(null); setEditOpen(true); }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Cancelled banner */}
        <CancelledBanner appointment={appointment} />

        {/* Tab strip */}
        <div className="flex gap-1 border-b border-slate-100 pb-0">
          {([
            { key: "detail",  label: "Detail" },
            { key: "history", label: "Riwayat", badge: rescheduleCount > 0 ? rescheduleCount : undefined },
          ] as { key: Tab; label: string; badge?: number }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50",
              ].join(" ")}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "detail" ? (
          <AppointmentDetailView appointment={appointment} />
        ) : (
          <div className="rounded-2xl border border-slate-100/80 bg-white shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-5">Riwayat Booking</h2>
            <HistoryTimeline appointment={appointment} />
          </div>
        )}
      </div>

      <AppointmentUpdateForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        defaultValues={appointment}
        error={editError}
      />

      <AppointmentStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentStatus={appointment.status}
        onSubmit={handleStatusChange}
        isPending={statusMutation.isPending}
        error={statusError}
      />
    </PageContainer>
  );
}
