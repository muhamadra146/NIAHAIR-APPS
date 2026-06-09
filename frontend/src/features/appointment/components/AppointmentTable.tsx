import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "../types";

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

function MobileCardList({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {appointments.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{a.customer.name}</p>
            <p className="text-xs text-muted-foreground">{a.bookingNo}</p>
            <p className="text-xs text-muted-foreground">{formatDate(a.visitDate)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <AppointmentStatusBadge status={a.status} />
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to={`/appointments/${a.id}`}>
                <Eye className="mr-1 h-3 w-3" />
                View
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopTable({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Booking No</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
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
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/appointments/${a.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AppointmentTable({ appointments, isLoading }: Props) {
  if (isLoading) return <LoadingState />;
  if (appointments.length === 0) return <EmptyState />;
  return (
    <>
      <MobileCardList appointments={appointments} />
      <DesktopTable appointments={appointments} />
    </>
  );
}
