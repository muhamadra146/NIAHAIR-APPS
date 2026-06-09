import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointment, useUpdateAppointment, useChangeAppointmentStatus } from "../hooks";
import { AppointmentDetailView } from "../components/AppointmentDetailView";
import { AppointmentUpdateForm } from "../components/AppointmentForm";
import { AppointmentStatusDialog } from "../components/AppointmentStatusDialog";
import { AppointmentStatusBadge } from "../components/AppointmentStatusBadge";
import type { UpdateAppointmentFormValues, ChangeStatusFormValues } from "../schemas/appointment.schema";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: appointment, isLoading, isError } = useAppointment(id!);
  const updateMutation = useUpdateAppointment(id!);
  const statusMutation = useChangeAppointmentStatus(id!);

  const [editOpen, setEditOpen]     = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function handleUpdate(values: UpdateAppointmentFormValues) {
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        visitDate:      values.visitDate || undefined,
        startTime:      values.startTime || undefined,
        endTime:        values.endTime   || undefined,
        notes:          values.notes     || undefined,
        estimatedTotal: values.estimatedTotal,
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

        <AppointmentDetailView appointment={appointment} />
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
