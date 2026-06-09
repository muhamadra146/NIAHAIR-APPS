import { useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppointments, useCreateAppointment } from "../hooks";
import { AppointmentTable } from "../components/AppointmentTable";
import { AppointmentCreateForm } from "../components/AppointmentForm";
import { STATUS_LABEL } from "../components/AppointmentStatusBadge";
import type { AppointmentStatus } from "../types";
import type { CreateAppointmentFormValues } from "../schemas/appointment.schema";

const ALL_STATUSES: AppointmentStatus[] = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

export function AppointmentListPage() {
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<AppointmentStatus | "">("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useAppointments({ page, limit: 20, status: status || undefined, startDate: startDate || undefined, endDate: endDate || undefined });
  const createMutation = useCreateAppointment();

  const appointments = data?.appointments ?? [];
  const meta         = data?.meta;
  const totalPages   = meta?.totalPages ?? 1;

  async function handleCreate(values: CreateAppointmentFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        customerId:     values.customerId,
        visitDate:      values.visitDate,
        startTime:      values.startTime,
        endTime:        values.endTime,
        notes:          values.notes || undefined,
        estimatedTotal: (values.services?.length ?? 0) > 0 ? undefined : values.estimatedTotal,
        services:       values.services?.map((s) => ({
          itemId: s.itemId,
          qty:    Number(s.qty),
          price:  Number(s.price),
        })),
      });
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create appointment");
    }
  }

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
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
        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap gap-3">
              {/* Status filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ""); setPage(1); }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStart(e.target.value); setPage(1); }}
                  className="h-9 w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                  className="h-9 w-36"
                />
              </div>

              {(status || startDate || endDate) && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }}
                    className="h-9 text-xs"
                  >
                    Clear
                  </Button>
                </div>
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
            <span className="text-muted-foreground">
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
