import { useState, useCallback, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { canApprove } from "@/lib/access";
import { toast } from "@/lib/toast";
import { PageContainer } from "@/components/layout/PageContainer";
import { useShifts, useRoster, useBulkSchedule } from "../hooks";
import { fetchRoster } from "../api/staffSchedule.api";
import { RosterNav }        from "../components/RosterNav";
import { RosterGrid }       from "../components/RosterGrid";
import { RosterSummary }    from "../components/RosterSummary";
import { MobileRosterView } from "../components/MobileRosterView";
import { ShiftCellDialog }  from "../components/ShiftCellDialog";
import type { RosterData, ScheduleStatus, ViewMode, ScheduleCell, RosterEmployee, BulkScheduleItem } from "../types";
import { isAbsenceStatus } from "../scheduleStatus";
import { wibDateParts } from "@/lib/utils";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  // Pakai tanggal kalender WIB (bukan UTC / zona device). Untuk input UTC-midnight
  // (tanggal murni) hasilnya tanggal yang sama. Kembalian = UTC midnight tanggal Senin.
  const { year, month, day: dom } = wibDateParts(date);
  const day = new Date(Date.UTC(year, month - 1, dom)).getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(year, month - 1, dom + diff));
}

function getFirstOfMonth(date: Date): Date {
  // Pakai tahun/bulan kalender WIB
  const { year, month } = wibDateParts(date);
  return new Date(Date.UTC(year, month - 1, 1));
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

/** Pesan galat dari respons API (fallback ke pesan umum) */
function apiErrorMessage(err: unknown, fallback: string): string {
  const r = (err as { response?: { data?: { message?: string; errors?: { message?: string }[] } } })?.response?.data;
  return r?.errors?.[0]?.message ?? r?.message ?? fallback;
}

function daysInMonth(dateStr: string): number {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const { branchId } = useAuthStore();
  // Semua karyawan boleh MELIHAT jadwal divisinya; mengubah hanya manager divisi / Owner / Super Admin
  const user       = useAuthStore((s) => s.user);
  const isViewOnly = useViewOnly() || !canApprove(user);

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
      "Salin jadwal dari minggu lalu ke minggu ini?\nJadwal yang sudah ada di minggu ini akan diganti.\nHari Cuti / Izin / Sakit tidak ikut disalin dan tidak ditimpa.",
    );
    if (!confirmed) return;

    setCopyError(null);
    const prevStart = toISODate(addDays(new Date(startDate), -7));

    setIsCopyPending(true);
    try {
      const [prevRoster, thisRoster] = await Promise.all([
        fetchRoster({ startDate: prevStart, days: 7, branchId }),
        fetchRoster({ startDate, days: 7, branchId }),
      ]);

      // Hari Cuti / Izin / Sakit minggu ini (dari pengajuan yang disetujui) tidak boleh ditimpa
      const absentThisWeek = new Set<string>();
      for (const row of thisRoster.rows) {
        for (const cell of row.schedules) {
          if (isAbsenceStatus(cell.status)) absentThisWeek.add(`${row.employee.id}|${cell.date}`);
        }
      }

      // Build bulk items: shift each date forward by 7 days.
      // Cuti / Izin / Sakit minggu lalu TIDAK disalin (hanya berasal dari pengajuan — keputusan user 2026-10-19)
      const schedules: BulkScheduleItem[] = [];
      let skippedSource = 0, skippedTarget = 0;
      for (const row of prevRoster.rows) {
        if (row.canEdit === false) continue;            // hanya staf yang boleh diubah
        for (const cell of row.schedules) {
          if (!cell.status) continue;                    // skip unscheduled
          if (isAbsenceStatus(cell.status)) { skippedSource++; continue; }
          if (cell.status === "WORKING" && !cell.shift?.id) { skippedSource++; continue; } // SCH-002
          const newDate = toISODate(addDays(new Date(cell.date), 7));
          if (absentThisWeek.has(`${row.employee.id}|${newDate}`)) { skippedTarget++; continue; }
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
        setCopyError(
          skippedSource + skippedTarget > 0
            ? "Tidak ada jadwal yang bisa disalin — jadwal minggu lalu hanya berisi hari Cuti / Izin / Sakit atau bentrok dengan Cuti / Izin / Sakit minggu ini."
            : "Minggu lalu tidak ada jadwal yang bisa disalin.",
        );
        return;
      }

      await bulkMut.mutateAsync({ branchId, schedules });
      const notes: string[] = [];
      if (skippedSource > 0) notes.push(`${skippedSource} hari Cuti/Izin/Sakit minggu lalu tidak disalin`);
      if (skippedTarget > 0) notes.push(`${skippedTarget} hari Cuti/Izin/Sakit minggu ini tidak ditimpa`);
      toast.success(`${schedules.length} jadwal disalin dari minggu lalu${notes.length ? ` (${notes.join("; ")})` : ""}.`);
    } catch (err) {
      setCopyError(apiErrorMessage(err, "Gagal menyalin jadwal minggu lalu. Coba lagi."));
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
      const row = rosterData?.rows.find((r) => r.employee.id === employeeId);
      if (row && row.canEdit === false) {
        toast.error("Jadwal ini hanya bisa diubah oleh manager divisinya atau Owner / Super Admin.");
        return;
      }
      try {
        await bulkMut.mutateAsync({
          branchId,
          schedules: [{ employeeId, date, shiftId, status, notes }],
        });
      } catch (err) {
        toast.error(apiErrorMessage(err, "Gagal menyimpan jadwal. Coba lagi."));
      }
    },
    [branchId, bulkMut, rosterData],
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
    <PageContainer
      title="Jadwal"
      subtitle={isViewOnly
        ? "Jadwal rekan satu divisi di cabang ini"
        : "Roster karyawan per cabang — klik sel atau tombol + untuk assign shift"}
    >
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
          <span>Memuat jadwal…</span>
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
            readOnly={isViewOnly}
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
          readOnly={isViewOnly}
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
