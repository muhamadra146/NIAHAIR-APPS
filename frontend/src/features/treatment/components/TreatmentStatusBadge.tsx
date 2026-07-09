import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreatmentStatusBadgeProps {
  completedAt: string | null;
  startedAt:   string | null;
  className?:  string;
}

export function TreatmentStatusBadge({
  completedAt,
  startedAt,
  className,
}: TreatmentStatusBadgeProps) {
  if (completedAt) {
    return (
      <Badge
        variant="outline"
        className={cn("border-emerald-200 bg-emerald-50 text-emerald-700", className)}
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Selesai
      </Badge>
    );
  }
  if (startedAt) {
    return (
      <Badge
        variant="outline"
        className={cn("border-blue-200 bg-blue-50 text-blue-700", className)}
      >
        <Clock className="mr-1 h-3 w-3" />
        Berlangsung
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn("border-amber-200 bg-amber-50 text-amber-700", className)}
    >
      <AlertCircle className="mr-1 h-3 w-3" />
      Belum Mulai
    </Badge>
  );
}
