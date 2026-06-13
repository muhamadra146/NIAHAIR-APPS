import { useState, useCallback } from "react";
import { Calendar, LogIn, LogOut, Pencil, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { useDailyRoster, useCheckIn, useCheckOut, useManualSetAttendance } from "../hooks";
import { toast } from "@/lib/toast";
import type { RosterAttendanceRow, AttendanceStatus, ManualSetInput } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT:     { label: "Hadir",         className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LATE:        { label: "Terlambat",     className: "bg-amber-100  text-amber-700  border-amber-200"  },
  ABSENT:      { label: "Absen",         className: "bg-red-100    text-red-700    border-red-200"    },
  HALF_DAY:    { label: "Setengah Hari", className: "bg-orange-100 text-orange-700 border-orange-200" },
  EARLY_LEAVE: { label: "Pulang Cepat",  className: "bg-sky-100    text-sky-700    border-sky-200"    },
};

function AttendanceBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">Belum Absen</Badge>;
  const cfg = STATUS_CONFIG[status];
  return <Badge className={`border ${cfg.className}`}>{cfg.label}</Badge>;
}

function ShiftBadge({ shift, scheduleStatus }: {
  shift: RosterAttendanceRow["shift"];
  scheduleStatus: RosterAttendanceRow["status"];
}) {
  if (scheduleStatus === "OFF")
    return <span className="text-xs text-gray-400 font-medium">LIBUR</span>;
  if (scheduleStatus === "LEAVE")
    return <span className="text-xs text-yellow-600 font-medium">CUTI</span>;
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

interface ManualDialogProps {
  open:       boolean;
  row:        RosterAttendanceRow | null;
  isPending:  boolean;
  onSave:     (input: ManualSetInput) => void;
  onClose:    () => void;
}

function ManualDialog({ open, row, isPending, onSave, onClose }: ManualDialogProps) {
  const now = new Date().toTimeString().slice(0, 5);
  const [status,    setStatus]    = useState<AttendanceStatus>("PRESENT");
  const [checkInAt,  setCheckIn]  = useState(now);
  const [checkOutAt, setCheckOut] = useState("");
  const [notes,      setNotes]    = useState("");

  if (!row) return null;

  const handleSave = () => {
    const workDate = new Date(row.attendance?.workDate ?? new Date()).toISOString().split("T")[0];
    onSave({
      staffScheduleId: row.scheduleId,
      status,
      checkInAt:  checkInAt  ? `${workDate}T${checkInAt}:00.000Z`  : undefined,
      checkOutAt: checkOutAt ? `${workDate}T${checkOutAt}:00.000Z` : undefined,
      notes:      notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Set Absensi Manual</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{row.employee.name}</p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jam Masuk</Label>
              <Input type="time" value={checkInAt} onChange={(e) => setCheckIn(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Jam Keluar</Label>
              <Input type="time" value={checkOutAt} onChange={(e) => setCheckOut(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ rows }: { rows: RosterAttendanceRow[] }) {
  const hadir    = rows.filter((r) => r.attendance?.status === "PRESENT" || r.attendance?.status === "LATE" || r.attendance?.status === "EARLY_LEAVE").length;
  const terlambat = rows.filter((r) => r.attendance?.status === "LATE").length;
  const absen    = rows.filter((r) => !r.attendance || r.attendance.status === "ABSENT").length;
  const libur    = rows.filter((r) => r.status === "OFF").length;

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { icon: CheckCircle2, label: "Hadir",      value: hadir,     color: "text-emerald-600" },
        { icon: Clock,        label: "Terlambat",   value: terlambat, color: "text-amber-600"  },
        { icon: XCircle,      label: "Absen",       value: absen,     color: "text-red-600"    },
        { icon: AlertCircle,  label: "Libur",       value: libur,     color: "text-gray-400"   },
      ].map(({ icon: Icon, label, value, color }) => (
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

export function AttendanceTab() {
  const { branchId } = useAuthStore();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualRow, setManualRow] = useState<RosterAttendanceRow | null>(null);

  const { data: rows = [], isLoading } = useDailyRoster(branchId ?? "", date);
  const checkInMut  = useCheckIn();
  const checkOutMut = useCheckOut();
  const manualMut   = useManualSetAttendance();
  const isActing    = checkInMut.isPending || checkOutMut.isPending || manualMut.isPending;

  const handleCheckIn = useCallback(async (scheduleId: string) => {
    try {
      await checkInMut.mutateAsync({ staffScheduleId: scheduleId });
      toast.success("Check in berhasil");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal check in");
    }
  }, [checkInMut]);

  const handleCheckOut = useCallback(async (scheduleId: string) => {
    try {
      await checkOutMut.mutateAsync({ staffScheduleId: scheduleId });
      toast.success("Check out berhasil");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal check out");
    }
  }, [checkOutMut]);

  const handleManualSave = useCallback(async (input: ManualSetInput) => {
    try {
      await manualMut.mutateAsync(input);
      toast.success("Absensi disimpan");
      setManualRow(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan");
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

      {/* Stats */}
      {rows.length > 0 && <StatsBar rows={rows} />}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Karyawan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shift</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Masuk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keluar</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Terlambat</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Tidak ada jadwal pada tanggal ini</td></tr>
            ) : rows.map((row) => {
              const att       = row.attendance;
              const canCheckIn  = !att?.checkInAt  && row.status !== "OFF";
              const canCheckOut = !!att?.checkInAt && !att?.checkOutAt;

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
                    <AttendanceBadge status={att?.status ?? null} />
                  </td>

                  {/* Times */}
                  <td className="px-4 py-3 tabular-nums text-sm">{fmtTime(att?.checkInAt)}</td>
                  <td className="px-4 py-3 tabular-nums text-sm">{fmtTime(att?.checkOutAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {att?.lateMinutes ? (
                      <span className="text-amber-600 font-medium">{att.lateMinutes} mnt</span>
                    ) : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canCheckIn && (
                        <Button
                          size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={() => handleCheckIn(row.scheduleId)}
                          disabled={isActing}
                        >
                          <LogIn className="h-3 w-3" /> Masuk
                        </Button>
                      )}
                      {canCheckOut && (
                        <Button
                          size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={() => handleCheckOut(row.scheduleId)}
                          disabled={isActing}
                        >
                          <LogOut className="h-3 w-3" /> Keluar
                        </Button>
                      )}
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setManualRow(row)}
                        title="Set manual"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
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
        isPending={manualMut.isPending}
        onSave={handleManualSave}
        onClose={() => setManualRow(null)}
      />
    </div>
  );
}
