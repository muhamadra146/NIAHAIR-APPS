import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { useAppointments, useCreateAppointment } from "../hooks";
import { AppointmentTable } from "../components/AppointmentTable";
import { AppointmentCreateForm, type PendingPhoto } from "../components/AppointmentForm";
import { uploadAppointmentPhoto } from "../api/appointment.api";
import { STATUS_LABEL } from "../components/AppointmentStatusBadge";
import type { AppointmentStatus } from "../types";
import type { CreateAppointmentFormValues } from "../schemas/appointment.schema";
import { linkDepositToAppointment } from "@/features/invoice/api";

const ALL_STATUSES: AppointmentStatus[] = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

export function AppointmentListPage() {
  const { branchId } = useAuthStore();
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<AppointmentStatus | "">("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useAppointments({
    page, limit: 20,
    branchId:  branchId ?? undefined,
    status:    status   || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });
  const createMutation = useCreateAppointment();

  const appointments = data?.appointments ?? [];
  const meta         = data?.meta;
  const totalPages   = meta?.totalPages ?? 1;

  async function handleCreate(values: CreateAppointmentFormValues, photos: PendingPhoto[], depositId: string | null) {
    setFormError(null);
    try {
      const appointment = await createMutation.mutateAsync({
        customerId:         values.customerId,
        visitDate:          values.visitDate,
        startTime:          values.startTime,
        endTime:            values.endTime,
        type:               values.type,
        homeServiceAddress: values.homeServiceAddress || undefined,
        notes:              values.notes || undefined,
        estimatedTotal:     (values.services?.length ?? 0) > 0 ? undefined : values.estimatedTotal,
        services:           values.services?.map((s) => ({
          itemId: s.itemId,
          qty:    Number(s.qty),
          price:  Number(s.price),
        })),
        staffsBySlot: values.staffsBySlot?.length ? values.staffsBySlot : undefined,
      });

      setFormOpen(false);

      if (appointment?.id) {
        if (photos.length > 0) {
          photos.forEach((p) => uploadAppointmentPhoto(appointment.id, p.file, p.type).catch(() => {}));
        }
        if (depositId) {
          linkDepositToAppointment(depositId, appointment.id).catch(() => {});
        }
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create appointment");
    }
  }

  return (
    <PageContainer>
      <div className="space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} total` : "Manage appointment bookings"}
            </p>
          </div>
          <Button onClick={() => { setFormError(null); setFormOpen(true); }} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Status */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Status</p>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ""); setPage(1); }}
              className={`${filterInputCls} px-3 text-sm w-44`}
            >
              <option value="">Semua Status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* Date range — grouped with s/d separator */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Periode</p>
            <div className="flex items-center gap-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStart(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
              <span className="text-muted-foreground text-xs px-1 select-none border-x border-slate-200 bg-slate-50/60 py-2">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          {(status || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* Table — flat border, no card */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <AppointmentTable appointments={appointments} isLoading={isLoading} />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Page {meta?.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AppointmentCreateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        error={formError}
      />
    </PageContainer>
  );
}
