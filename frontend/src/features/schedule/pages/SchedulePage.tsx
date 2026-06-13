import { useState, useCallback, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useShifts, useRoster, useBulkSchedule } from "../hooks";
import { RosterNav }        from "../components/RosterNav";
import { RosterGrid }       from "../components/RosterGrid";
import { RosterSummary }    from "../components/RosterSummary";
import { MobileRosterView } from "../components/MobileRosterView";
import type { RosterData, ScheduleStatus, ViewMode } from "../types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getFirstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  d.setUTCDate(1);
  return d;
}

function daysInMonth(dateStr: string): number {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const { branchId } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [startDate, setStartDate] = useState<string>(() =>
    toISODate(getMonday(new Date())),
  );

  const days = viewMode === "week" ? 7 : daysInMonth(startDate);

  // ── Local dates (used as fallback when API hasn't responded yet) ──────────
  const localDates = useMemo<string[]>(() => {
    const result: string[] = [];
    const d = new Date(startDate);
    d.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const cur = new Date(d);
      cur.setUTCDate(cur.getUTCDate() + i);
      result.push(cur.toISOString().split("T")[0]);
    }
    return result;
  }, [startDate, days]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: shifts = [] } = useShifts();

  const {
    data:      rosterData,
    isLoading: rosterLoading,
    isError:   rosterError,
    refetch:   refetchRoster,
  } = useRoster(
    { startDate, days, branchId: branchId ?? "" },
    !!branchId,
  );

  const bulkMut = useBulkSchedule();

  // Exclude management/owner roles from the schedule grid
  const EXCLUDED_ROLES = new Set(["OWNER", "SUPER_ADMIN"]);

  const filteredRows = (rosterData?.rows ?? []).filter(
    (row) => !EXCLUDED_ROLES.has(row.employee.role?.code ?? ""),
  );

  // Grid always has data — fall back to empty rows while loading / on error
  const gridData: RosterData = rosterData
    ? { ...rosterData, rows: filteredRows }
    : { dates: localDates, rows: [] };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev = useCallback(() => {
    if (viewMode === "week") {
      setStartDate((d) => toISODate(addDays(new Date(d), -7)));
    } else {
      setStartDate((d) => toISODate(addMonths(new Date(d), -1)));
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === "week") {
      setStartDate((d) => toISODate(addDays(new Date(d), 7)));
    } else {
      setStartDate((d) => toISODate(addMonths(new Date(d), 1)));
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    if (viewMode === "week") {
      setStartDate(toISODate(getMonday(new Date())));
    } else {
      setStartDate(toISODate(getFirstOfMonth(new Date())));
    }
  }, [viewMode]);

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "month") {
      setStartDate((d) => toISODate(getFirstOfMonth(new Date(d))));
    } else {
      setStartDate((d) => toISODate(getMonday(new Date(d))));
    }
  }, []);

  // ── Cell save ─────────────────────────────────────────────────────────────
  const handleCellSave = useCallback(
    async (
      employeeId: string,
      date: string,
      shiftId: string | null,
      status: ScheduleStatus | null,
    ) => {
      if (!branchId) return;
      await bulkMut.mutateAsync({
        branchId,
        schedules: [{ employeeId, date, shiftId, status }],
      });
    },
    [branchId, bulkMut],
  );

  // ── No branch guard ───────────────────────────────────────────────────────
  if (!branchId) {
    return (
      <div className="flex h-60 items-center justify-center">
        <p className="text-sm text-muted-foreground">Pilih cabang terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Schedule</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Staff roster per branch · klik sel atau tombol&nbsp;<strong>+</strong>&nbsp;untuk assign shift
        </p>
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <RosterNav
        startDate={startDate}
        viewMode={viewMode}
        onViewMode={handleViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      {/* ── Error banner ────────────────────────────────────── */}
      {rosterError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load schedule data.</span>
          <button
            type="button"
            onClick={() => refetchRoster()}
            className="ml-auto underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading overlay ─────────────────────────────────── */}
      {rosterLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading schedule…</span>
        </div>
      )}

      {/* ── Desktop: grid + right panel ─────────────────────── */}
      <div className="hidden lg:flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <RosterGrid
            data={gridData}
            shifts={shifts}
            branchId={branchId}
            viewMode={viewMode}
            isPending={rosterLoading || bulkMut.isPending}
            onCellSave={handleCellSave}
          />
        </div>
        <div className="w-64 shrink-0">
          <RosterSummary data={gridData} shifts={shifts} />
        </div>
      </div>

      {/* ── Tablet: grid only ───────────────────────────────── */}
      <div className="hidden md:block lg:hidden">
        <RosterGrid
          data={gridData}
          shifts={shifts}
          branchId={branchId}
          isPending={rosterLoading || bulkMut.isPending}
          onCellSave={handleCellSave}
        />
      </div>

      {/* ── Mobile: cards + summary ─────────────────────────── */}
      <div className="md:hidden">
        {rosterData ? (
          <>
            <MobileRosterView data={rosterData} />
            <div className="mt-4">
              <RosterSummary data={rosterData} shifts={shifts} />
            </div>
          </>
        ) : (
          <RosterGrid
            data={gridData}
            shifts={shifts}
            branchId={branchId}
            viewMode={viewMode}
            isPending={rosterLoading || bulkMut.isPending}
            onCellSave={handleCellSave}
          />
        )}
      </div>
    </div>
  );
}
