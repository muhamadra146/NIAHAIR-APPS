import { useState, useCallback, useEffect } from "react";
import { Calendar, Pencil, CheckCircle2, XCircle, Clock, AlertCircle, Hourglass, Plane, FileText, Thermometer } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { useDailyRoster, useManualSetAttendance } from "../hooks";
import { toast } from "@/lib/toast";
import type { RosterAttendanceRow, AttendanceStatus, ManualSetInput } from "../types";
import { WIB_TZ, toWibDateStr, toWibTimeStr } from "@/lib/utils";
import { rowDayState, summarizeRoster, type RowDayState } from "../attendanceSummary";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { timeZone: WIB_TZ, hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT:     { label: "Hadir",         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LATE:        { label: "Terlambat",     className: "bg-amber-100  text-amber-700  border-amber-200"  },
  ABSENT:      { label: "Absen",         className: "bg-red-100    text-red-700    border-red-200"    },
  HALF_DAY:    { label: "Setengah Hari", className: "bg-orange-100 text-orange-700 border-orange-200" },
  EARLY_LEAVE: { label: "Pulang Cepat",  className: "bg-sky-100    text-sky-700    border-sky-200"    },
};

const DAY_STATE_BADGE: Record<Exclude<RowDayState, "HADIR">, { label: string; className: string }> = {
  ABSEN:       { label: "Absen",       className: "bg-red-100 text-red-700 border-red-200" },
  BELUM_ABSEN: { label: "Belum Absen", className: "bg-transparent text-muted-foreground border-border" },
  LIBUR:       { label: "Libur",       className: "bg-gray-100 text-gray-500 border-gray-200" },
  CUTI:        { label: "Cuti",        className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  IZIN:        { label: "Izin",        className: "bg-violet-100 text-violet-700 border-violet-200" },
  SAKIT:       { label: "Sakit",       className: "bg-rose-100 text-rose-700 border-rose-200" },
};

function AttendanceBadge({ row, date, today }: { row: RosterAttendanceRow; date: string; today: string }) {
  const state = rowDayState(row, date, today);
  const cfg = state === "HADIR" && row.attendance
    ? STATUS_CONFIG[row.attendance.status]
    : DAY_STATE_BADGE[state as Exclude<RowDayState, "HADIR">];
  return <Badge variant="outline" className={`border ${cfg.className}`}>{cfg.label}</Badge>;
}

const SCHEDULE_LABEL: Partial<Record<RosterAttendanceRow["status"], { label: string; className: string }>> = {
  OFF:   { label: "LIBUR", className: "text-gray-400" },
  LEAVE: { label: "CUTI",  className: "text-yellow-600" },
  IZIN:  { label: "IZIN",  className: "text-violet-600" },
  SAKIT: { label: "SAKIT", className: "text-rose-600" },
};

function ShiftBadge({ shift, scheduleStatus }: {
  shift: RosterAttendanceRow["shift"];
  scheduleStatus: RosterAttendanceRow["status"];
}) {
  const lbl = SCHEDULE_LABEL[scheduleStatus];
  if (lbl) return <span className={`text-xs font-medium ${lbl.className}`}>{lbl.label}</span>;
  if (!shift)
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{
        backgroundColor: shift.color ? `${shift.color}20` : "#dbeafe",
        borderColor:     shift.color ? `${shift.color}60` : "#93c5fd",
        color:           shift.color ?? "#1e40af",
      }}
    >
      {shift.startTime}–{shift.endTime} ({shift.code})
    </span>
  );
}

// ── Manual Set Dialog ─────────────────────────────────────────────────────────
// Status Hadir / Terlambat / Pulang Cepat / Setengah Hari dihitung otomatis dari jam & shift
// (backend). Yang dipilih manual hanya "Hadir (isi jam)" atau "Tidak hadir (Absen)".

interface ManualDialogProps {
  open:       boolean;
  row:        RosterAttendanceRow | null;
  date:       string;   // tanggal roster = tanggal jadwal
  isPending:  boolean;
  onSave:     (input: ManualSetInput) => void;
  onClose:    () => void;
}

function ManualDialog({ open, row, date, isPending, onSave, onClose }: ManualDialogProps) {
  const [mode,       setMode]     = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [checkInAt,  setCheckIn]  = useState("");
  const [checkOutAt, setCheckOut] = useState("");
  const [notes,      setNotes]    = useState("");

  useEffect(() => {
    if (open && row) {
      const att = row.attendance;
      setMode(att?.status === "ABSENT" ? "ABSENT" : "PRESENT");
      setCheckIn(att?.checkInAt  ? toWibTimeStr(att.checkInAt)  : "");
      setCheckOut(att?.checkOutAt ? toWibTimeStr(att.checkOutAt) : "");
      setNotes(att?.notes ?? "");
    }
  }, [open, row]);

  if (!row) return null;

  const timeInvalid = mode === "PRESENT" && !!checkInAt && !!checkOutAt && checkOutAt <= checkInAt;
  const missingIn   = mode === "PRESENT" && !checkInAt;

  const handleSave = () => {
    if (mode === "ABSENT") {
      onSave({ staffScheduleId: row.scheduleId, status: "ABSENT", notes: notes.trim() });
      return;
    }
    // Jam dari input = jam WIB pada tanggal jadwal; jam keluar kosong = dikosongkan
    onSave({
      staffScheduleId: row.scheduleId,
      checkInAt:  `${date}T${checkInAt}:00+07:00`,
      checkOutAt: checkOutAt ? `${date}T${checkOutAt}:00+07:00` : null,
      notes:      notes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Set Absensi Manual</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{row.employee.name} · {date}</p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Kehadiran</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "PRESENT" | "ABSENT")}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="PRESENT">Hadir (isi jam masuk/keluar)</option>
              <option value="ABSENT">Tidak hadir (Absen)</option>
            </select>
            {mode === "PRESENT" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Status Hadir / Terlambat / Pulang Cepat dihitung otomatis dari jam &amp; shift.
              </p>
            )}
          </div>
          {mode === "PRESENT" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jam Masuk <span className="text-destructive">*</span></Label>
                <Input type="time" value={checkInAt} onChange={(e) => setCheckIn(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Jam Keluar</Label>
                <Input type="time" value={checkOutAt} onChange={(e) => setCheckOut(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Alasan <span className="text-destructive">*</span></Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wajib, minimal 3 karakter" className="mt-1" />
            {timeInvalid && (
              <p className="mt-1 text-xs text-destructive">Jam keluar harus setelah jam masuk.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || notes.trim().length < 3 || timeInvalid || missingIn}
          >
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ rows, date, today }: { rows: RosterAttendanceRow[]; date: string; today: string }) {
  const s = summarizeRoster(rows, date, today);
  const items = [
    { icon: CheckCircle2, label: "Hadir",       value: s.hadir,      color: "text-emerald-600" },
    { icon: Clock,        label: "Terlambat",   value: s.terlambat,  color: "text-amber-600"   },
    { icon: Hourglass,    label: "Belum Absen", value: s.belumAbsen, color: "text-slate-500"   },
    { icon: XCircle,      label: "Absen",       value: s.absen,      color: "text-red-600"     },
    { icon: Plane,        label: "Cuti",        value: s.cuti,       color: "text-yellow-600"  },
    { icon: FileText,     label: "Izin",        value: s.izin,       color: "text-violet-600"  },
    { icon: Thermometer,  label: "Sakit",       value: s.sakit,      color: "text-rose-600"    },
    { icon: AlertCircle,  label: "Libur",       value: s.libur,      color: "text-gray-400"    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
          <Icon className={`mx-auto h-4 w-4 ${color}`} />
          <p className="mt-1 text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// Absen masuk / keluar karyawan lain tidak dilakukan di sini (absen sendiri lewat tab Absensi Saya).
// Koreksi jam karyawan: tombol Absensi Manual, hanya untuk staf yang boleh diurus (canManualSet).

export function AttendanceTab({ readOnly = false }: { readOnly?: boolean } = {}) {
  const { branchId } = useAuthStore();
  const today = toWibDateStr();
  const [date, setDate] = useState(() => toWibDateStr());
  const [manualRow, setManualRow] = useState<RosterAttendanceRow | null>(null);

  const { data: rows = [], isLoading, isError, refetch } = useDailyRoster(branchId ?? "", date);
  const manualMut = useManualSetAttendance();

  const handleManualSave = useCallback(async (input: ManualSetInput) => {
    try {
      await manualMut.mutateAsync(input);
      toast.success("Absensi disimpan");
      setManualRow(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : "Gagal menyimpan absensi");
    }
  }, [manualMut]);

  if (!branchId) return (
    <div className="py-10 text-center text-sm text-muted-foreground">Pilih cabang terlebih dahulu.</div>
  );

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {/* Error state (MISSING 3 FIX) */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Gagal memuat data absensi.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-auto underline underline-offset-2 hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Stats */}
      {rows.length > 0 && <StatsBar rows={rows} date={date} today={today} />}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Karyawan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shift</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Masuk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keluar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Terlambat</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lembur</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Tidak ada jadwal pada tanggal ini</td></tr>
            ) : rows.map((row) => {
              const att = row.attendance;

              return (
                <tr key={row.scheduleId} className="hover:bg-muted/20 transition-colors">
                  {/* Employee */}
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
                  </td>

                  {/* Shift */}
                  <td className="px-4 py-3">
                    <ShiftBadge shift={row.shift} scheduleStatus={row.status} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <AttendanceBadge row={row} date={date} today={today} />
                  </td>

                  {/* Times */}
                  <td className="px-4 py-3 tabular-nums text-sm">{fmtTime(att?.checkInAt)}</td>
                  <td className="px-4 py-3 tabular-nums text-sm">{fmtTime(att?.checkOutAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {att?.lateMinutes ? (
                      <span className="text-amber-600 font-medium">{att.lateMinutes} mnt</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {att?.overtimeMinutes ? (
                      <span className="text-blue-600 font-medium">{att.overtimeMinutes} mnt</span>
                    ) : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!readOnly && row.canManualSet && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setManualRow(row)}
                          title="Set absensi manual"
                          aria-label={`Set absensi manual ${row.employee.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ManualDialog
        open={!!manualRow}
        row={manualRow}
        date={date}
        isPending={manualMut.isPending}
        onSave={handleManualSave}
        onClose={() => setManualRow(null)}
      />
    </div>
  );
}
