import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "../types";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED:      "Booked",
  CONFIRMED:   "Confirmed",
  CHECK_IN:    "Check In",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Selesai",
  CANCELLED:   "Cancelled",
  NO_SHOW:     "Reschedule",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  BOOKED:      "bg-slate-50 text-slate-600 border-slate-200",
  CONFIRMED:   "bg-blue-50 text-blue-700 border-blue-200",
  CHECK_IN:    "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 border-violet-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:   "bg-red-50 text-red-600 border-red-200",
  NO_SHOW:     "bg-slate-50 text-slate-500 border-slate-200",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium rounded-lg px-2 py-0.5 ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
