import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Home, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { useDeleteAppointment } from "../hooks";
import { useAuthStore } from "@/stores/authStore";
import type { Appointment } from "../types";

const CAN_DELETE_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER"] as const;

interface Props {
  appointments: Appointment[];
  isLoading:    boolean;
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      No appointments found.
    </div>
  );
}

function DeleteConfirmDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteAppointment();

  const handleConfirm = async () => {
    await deleteMutation.mutateAsync(appointment.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Appointment?</DialogTitle>
          <DialogDescription>
            Appointment <strong>{appointment.bookingNo}</strong> ({appointment.customer.name}) akan
            dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MobileCardList({ appointments, canDelete }: { appointments: Appointment[]; canDelete: boolean }) {
  const [toDelete, setToDelete] = useState<Appointment | null>(null);

  return (
    <>
      <div className="divide-y divide-border md:hidden">
        {appointments.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">{a.customer.name}</p>
                {a.type === "HOME_SERVICE" && (
                  <Home className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{a.bookingNo}</p>
              <p className="text-xs text-muted-foreground">{formatDate(a.visitDate)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <AppointmentStatusBadge status={a.status} />
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                  <Link to={`/appointments/${a.id}`}>
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Link>
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setToDelete(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {toDelete && (
        <DeleteConfirmDialog appointment={toDelete} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}

function DesktopTable({ appointments, canDelete }: { appointments: Appointment[]; canDelete: boolean }) {
  const [toDelete, setToDelete] = useState<Appointment | null>(null);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Booking No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visit Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Est. Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-b border-border transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.bookingNo}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.customer.name}</p>
                  {a.customer.mobilePhone && (
                    <p className="text-xs text-muted-foreground">{a.customer.mobilePhone}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.type === "HOME_SERVICE" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                      <Home className="h-3 w-3" /> HS
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Salon</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.branch.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(a.visitDate)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(a.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {a.estimatedTotal ? formatCurrency(a.estimatedTotal) : "—"}
                </td>
                <td className="px-4 py-3">
                  <AppointmentStatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/appointments/${a.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(a)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toDelete && (
        <DeleteConfirmDialog appointment={toDelete} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}

export function AppointmentTable({ appointments, isLoading }: Props) {
  const { user } = useAuthStore();
  const canDelete = CAN_DELETE_ROLES.includes(user?.roleCode as typeof CAN_DELETE_ROLES[number]);

  if (isLoading) return <LoadingState />;
  if (appointments.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList appointments={appointments} canDelete={canDelete} />
      <DesktopTable appointments={appointments} canDelete={canDelete} />
    </>
  );
}
