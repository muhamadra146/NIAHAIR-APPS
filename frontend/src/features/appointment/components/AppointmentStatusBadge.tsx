import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "../types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED:      "Booked",
  CONFIRMED:   "Confirmed",
  CHECK_IN:    "Check In",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Selesai",
  CANCELLED:   "Cancelled",
  NO_SHOW:     "Reschedule",
};

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "secondary" | "outline";

const STATUS_VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  BOOKED:      "default",
  CONFIRMED:   "success",
  CHECK_IN:    "warning",
  IN_PROGRESS: "outline",
  COMPLETED:   "success",
  CANCELLED:   "destructive",
  NO_SHOW:     "secondary",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export { STATUS_LABEL };
