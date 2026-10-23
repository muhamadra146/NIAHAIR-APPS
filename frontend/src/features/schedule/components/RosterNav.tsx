import { ChevronLeft, ChevronRight, CalendarDays, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "../types";
import { WIB_TZ } from "@/lib/utils";

interface Props {
  startDate:        string;
  viewMode:         ViewMode;
  onViewMode:       (mode: ViewMode) => void;
  onPrev:           () => void;
  onNext:           () => void;
  onToday:          () => void;
  onCopyLastWeek?:  () => void;
  isCopyPending?:   boolean;
}

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: WIB_TZ });
}

function weekLabel(startDate: string, days: number): string {
  const start = new Date(startDate);
  const end   = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + days - 1);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: WIB_TZ };
  return `${start.toLocaleDateString("id-ID", opts)} – ${end.toLocaleDateString("id-ID", { ...opts, year: "numeric" })}`;
}

export function RosterNav({
  startDate, viewMode, onViewMode,
  onPrev, onNext, onToday,
  onCopyLastWeek, isCopyPending,
}: Props) {
  const days = viewMode === "week" ? 7 : 30;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: navigation */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" onClick={onPrev} className="h-8 w-8" aria-label="Sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-[180px] text-center">
          <p className="text-sm font-semibold">
            {viewMode === "week" ? weekLabel(startDate, days) : monthLabel(startDate)}
          </p>
        </div>

        <Button variant="outline" size="icon" onClick={onNext} className="h-8 w-8" aria-label="Berikutnya">
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onToday} className="ml-1 h-8">
          {viewMode === "week" ? "Minggu Ini" : "Bulan Ini"}
        </Button>

        {/* Copy Last Week — only in week view */}
        {viewMode === "week" && onCopyLastWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLastWeek}
            disabled={isCopyPending}
            className="ml-1 h-8 gap-1.5"
            title="Salin jadwal minggu lalu ke minggu ini"
          >
            {isCopyPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Salin Minggu Lalu</span>
            <span className="sm:hidden">Salin</span>
          </Button>
        )}
      </div>

      {/* Right: view toggle + month label */}
      <div className="flex items-center gap-2">
        <p className="hidden sm:block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          ROSTER KARYAWAN NIAHAIR&nbsp;&nbsp;{monthLabel(startDate)}
        </p>

        {/* View toggle */}
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => onViewMode("week")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Minggu
          </button>
          <button
            type="button"
            onClick={() => onViewMode("month")}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border transition-colors",
              viewMode === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            Bulan
          </button>
        </div>
      </div>
    </div>
  );
}
