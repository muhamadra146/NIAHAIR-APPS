import { useState, useCallback, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { PageContainer } from "@/components/layout/PageContainer";
import { useShifts, useRoster, useBulkSchedule } from "../hooks";
import { fetchRoster } from "../api/staffSchedule.api";
import { RosterNav }        from "../components/RosterNav";
import { RosterGrid }       from "../components/RosterGrid";
import { RosterSummary }    from "../components/RosterSummary";
import { MobileRosterView } from "../components/MobileRosterView";
import { ShiftCellDialog }  from "../components/ShiftCellDialog";
import type { RosterData, ScheduleStatus, ViewMode, ScheduleCell, RosterEmployee, BulkScheduleItem } from "../types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  // Use LOCAL weekday — getUTCDay() returns the wrong day for WIB users
  // between midnight and 07:00 (UTC is still the previous day)
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(monday.getDate() + diff); // local date arithmetic
  // Convert back to UTC midnight so toISODate() (.toISOString()) gives correct YYYY-MM-DD
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

function getFirstOfMonth(date: Date): Date {
  // Use LOCAL year/month to avoid the off-by-one bug for WIB users midnight-07:00
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return new Date(`${y}-${m}-01T00:00:00.000Z`);
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
  const isViewOnly = useViewOnly();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [startDate, setStartDate] = useState<string>(() =>
    toISODate(getMonday(new Date())),
  );

  // Mobile edit dialog state
  const [mobileEditDialog, setMobileEditDialog] = useState<{
    employee: RosterEmployee;
    date:     string;
    cell:     ScheduleCell | null;
  } | null>(null);

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

  const [isCopyPending, setIsCopyPending] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

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

  // ── Copy last week ────────────────────────────────────────────────────────
  const handleCopyLastWeek = useCallback(async () => {
    if (!branchId || viewMode !== "week") return;

    const confirmed = window.confirm(
      "Salin semua jadwal dari minggu lalu ke minggu ini?\nJadwal yang sudah ada di minggu ini akan diganti.",
    );
    if (!confirmed) return;

    setCopyError(null);
    const prevStart = toISODate(addDays(new Date(startDate), -7));

    setIsCopyPending(true);
    try {
      const prevRoster = await fetchRoster({ startDate: prevStart, days: 7, branchId });

      // Build bulk items: shift each date forward by 7 days
      const schedules: BulkScheduleItem[] = [];
      for (const row of prevRoster.rows) {
        for (const cell of row.schedules) {
          if (!cell.status) continue;                    // skip unscheduled
          const newDate = toISODate(addDays(new Date(cell.date), 7));
          schedules.push({
            employeeId: row.employee.id,
            date:       newDate,
            shiftId:    cell.shift?.id ?? null,
            status:     cell.status,
            notes:      cell.notes,
          });
        }
      }

      if (schedules.length === 0) {
        setCopyError("Minggu lalu tidak ada jadwal yang bisa disalin.");
        return;
      }

      await bulkMut.mutateAsync({ branchId, schedules });
    } catch {
      setCopyError("Gagal menyalin jadwal minggu lalu. Coba lagi.");
    } finally {
      setIsCopyPending(false);
    }
  }, [branchId, viewMode, startDate, bulkMut]);

  // ── Cell save ─────────────────────────────────────────────────────────────
  const handleCellSave = useCallback(
    async (
      employeeId: string,
      date: string,
      shiftId: string | null,
      status: ScheduleStatus | null,
      notes?: string | null,
    ) => {
      if (!branchId) return;
      await bulkMut.mutateAsync({
        branchId,
        schedules: [{ employeeId, date, shiftId, status, notes }],
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
    <PageContainer title="Jadwal" subtitle="Roster karyawan per cabang — klik sel atau tombol + untuk assign shift">
      <div className="space-y-4">

      {/* ── Navigation ──────────────────────────────────────── */}
      <RosterNav
        startDate={startDate}
        viewMode={viewMode}
        onViewMode={handleViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onCopyLastWeek={isViewOnly ? undefined : handleCopyLastWeek}
        isCopyPending={isCopyPending || bulkMut.isPending}
      />

      {/* ── Error banners ───────────────────────────────────── */}
      {rosterError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat data jadwal.</span>
          <button
            type="button"
            onClick={() => refetchRoster()}
            className="ml-auto underline underline-offset-2 hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {copyError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{copyError}</span>
          <button
            type="button"
            onClick={() => setCopyError(null)}
            className="ml-auto underline underline-offset-2 hover:no-underline"
          >
            Tutup
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
            onCellSave={isViewOnly ? async () => {} : handleCellSave}
          />
        </div>
        <div className="w-64 shrink-0">
          <RosterSummary data={gridData} shifts={shifts} />
        </div>
      </div>

      {/* ── Tablet: grid + summary (stacked) ────────────────── */}
      <div className="hidden md:block lg:hidden space-y-4">
        <RosterGrid
          data={gridData}
          shifts={shifts}
          branchId={branchId}
          viewMode={viewMode}
          isPending={rosterLoading || bulkMut.isPending}
          onCellSave={isViewOnly ? async () => {} : handleCellSave}
        />
        <RosterSummary data={gridData} shifts={shifts} />
      </div>

      {/* ── Mobile: cards + summary ─────────────────────────── */}
      <div className="md:hidden">
        <MobileRosterView
          data={gridData}
          isViewOnly={isViewOnly}
          onCellClick={(employee, date, cell) =>
            setMobileEditDialog({ employee, date, cell })
          }
          onUnassign={(employeeId, date) =>
            handleCellSave(employeeId, date, null, null)
          }
        />
        {rosterData && (
          <div className="mt-4">
            <RosterSummary data={gridData} shifts={shifts} />
          </div>
        )}
      </div>

      {/* ── Mobile edit dialog ──────────────────────────────── */}
      <ShiftCellDialog
        open={!!mobileEditDialog}
        onOpenChange={(open) => { if (!open) setMobileEditDialog(null); }}
        employee={mobileEditDialog?.employee ?? null}
        date={mobileEditDialog?.date ?? null}
        cell={mobileEditDialog?.cell ?? null}
        shifts={shifts}
        isPending={rosterLoading || bulkMut.isPending}
        onSave={(shiftId, status, notes) => {
          if (!mobileEditDialog) return;
          handleCellSave(mobileEditDialog.employee.id, mobileEditDialog.date, shiftId, status, notes);
          setMobileEditDialog(null);
        }}
      />
    </div>
    </PageContainer>
  );
}
