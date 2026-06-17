import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

        {/* Filter + table card */}
        <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 pt-4">
            <div className="flex flex-wrap items-end gap-3">

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</Label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ""); setPage(1); }}
                  className={`${filterInputCls} px-3 text-sm`}
                >
                  <option value="">All statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStart(e.target.value); setPage(1); }}
                  className={`${filterInputCls} w-36`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                  className={`${filterInputCls} w-36`}
                />
              </div>

              {(status || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }}
                  className="h-9 text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <AppointmentTable appointments={appointments} isLoading={isLoading} />
          </CardContent>
        </Card>

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
