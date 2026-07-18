import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Eye, Home, Trash2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
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
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-slate-400">
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
    try {
      await deleteMutation.mutateAsync(appointment.id);
      onClose();
    } catch { /* error shown by hook onError toast */ }
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
      <div className="divide-y divide-slate-100 md:hidden">
        {appointments.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-slate-800">{a.customer.name}</p>
                {a.type === "HOME_SERVICE" && (
                  <Home className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{a.bookingNo}</p>
              <p className="text-xs text-slate-400">{formatDate(a.visitDate)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <AppointmentStatusBadge status={a.status} />
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" asChild>
                  <Link to={`/appointments/${a.id}`}>
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Link>
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-lg p-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
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
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Booking No</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tipe</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cabang</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jam</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((a) => (
              <tr key={a.id} className="group hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{a.bookingNo}</td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800">{a.customer.name}</p>
                  {a.customer.mobilePhone && (
                    <p className="text-xs text-slate-400 mt-0.5">{a.customer.mobilePhone}</p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {a.type === "HOME_SERVICE" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                      <Home className="h-3 w-3" /> Home
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Salon</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-500 text-sm">{a.branch.name}</td>
                <td className="px-5 py-3.5 text-slate-500 text-sm whitespace-nowrap">{formatDate(a.visitDate)}</td>
                <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                  {new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(a.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-5 py-3.5">
                  <AppointmentStatusBadge status={a.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/appointments/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                    >
                      Lihat <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setToDelete(a)}
                        className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
