import { useState } from "react";
import { Plus, Check, X, Clock, AlertTriangle, CalendarDays, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import {
  useCorrections, useMyCorrections, useCreateCorrection, useReviewCorrection,
} from "../hooks";
import type { CorrectionRequest, CorrectionStatus, CreateCorrectionInput } from "../types";

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateFull  = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;

const relativeDay = (iso: string) => {
  const today    = new Date(); today.setHours(0,0,0,0);
  const d        = new Date(iso); d.setHours(0,0,0,0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays <= 6) return `${diffDays} hari lalu`;
  return null;
};

// Extract HH:MM from ISO datetime
const isoToTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
};

// Build ISO datetime from date string + HH:MM time string
const buildISO = (workDate: string, timeStr: string) => {
  if (!timeStr) return "";
  return `${workDate.split("T")[0]}T${timeStr}:00`;
};

const STATUS_CFG: Record<CorrectionStatus, { label: string; className: string }> = {
  PENDING:  { label: "Menunggu",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED: { label: "Ditolak",   className: "bg-red-50 text-red-700 border border-red-200" },
};

function StatusBadge({ status }: { status: CorrectionStatus }) {
  const cfg = STATUS_CFG[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>{cfg.label}</span>;
}

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MySchedule {
  id:         string;
  workDate:   string;
  status:     string;
  shift:      { id: string; name: string; startTime: string | null; endTime: string | null } | null;
  attendance: { id: string; checkIn: string | null; checkOut: string | null; status: string } | null;
}

// ── Quick reason chips ────────────────────────────────────────────────────────

const REASONS = [
  "Lupa check-in",
  "Lupa check-out",
  "HP mati / kehabisan baterai",
  "Sinyal tidak ada",
  "Lokasi tidak terdeteksi",
  "Kesalahan sistem",
];

// ── Create Dialog (3-step wizard) ─────────────────────────────────────────────

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]                   = useState<1 | 2 | 3>(1);
  const [selected, setSelected]           = useState<MySchedule | null>(null);
  const [checkInTime,  setCheckInTime ]   = useState("");
  const [checkOutTime, setCheckOutTime]   = useState("");
  const [reason, setReason]               = useState("");
  const [customReason, setCustomReason]   = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const createMut = useCreateCorrection();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["mySchedules"],
    queryFn: async () => {
      const now   = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 30);
      const res = await api.get<{ data: MySchedule[] }>("/staff-schedules/my", {
        params: { startDate: start.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] },
      });
      return res.data.data;
    },
    enabled: open,
  });

  function handleClose() {
    setStep(1); setSelected(null);
    setCheckInTime(""); setCheckOutTime("");
    setReason(""); setCustomReason(""); setError(null);
    onClose();
  }

  function handleSelectSchedule(s: MySchedule) {
    setSelected(s);
    // attendance checkIn/checkOut are ISO datetimes; shift startTime/endTime are "HH:MM" strings
    setCheckInTime(isoToTime(s.attendance?.checkIn)  || s.shift?.startTime || "");
    setCheckOutTime(isoToTime(s.attendance?.checkOut) || s.shift?.endTime   || "");
    setStep(2);
  }

  async function handleSubmit() {
    setError(null);
    const finalReason = customReason || reason;
    if (!selected || !finalReason) return;
    if (!checkInTime && !checkOutTime) {
      setError("Isi minimal satu: waktu check-in atau check-out");
      return;
    }
    try {
      const input: CreateCorrectionInput = {
        staffScheduleId:   selected.id,
        attendanceId:      selected.attendance?.id,
        requestedCheckIn:  checkInTime  ? buildISO(selected.workDate, checkInTime)  : undefined,
        requestedCheckOut: checkOutTime ? buildISO(selected.workDate, checkOutTime) : undefined,
        reason:            finalReason,
      };
      await createMut.mutateAsync(input);
      handleClose();
    } catch (err) { setError(apiErr(err)); }
  }

  const workingSchedules = schedules.filter((s) => s.status === "WORKING");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-1">
          {[1,2,3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? "bg-primary" : "bg-slate-200"}`} />
          ))}
        </div>

        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 1 && "Pilih Tanggal"}
            {step === 2 && "Konfirmasi Waktu"}
            {step === 3 && "Pilih Alasan"}
          </DialogTitle>
          <p className="text-xs text-slate-400">
            {step === 1 && "Pilih hari yang absensinya perlu dikoreksi"}
            {step === 2 && "Periksa dan sesuaikan waktu yang benar"}
            {step === 3 && "Kenapa absensi perlu dikoreksi?"}
          </p>
        </DialogHeader>

        {/* ── STEP 1: pilih tanggal ── */}
        {step === 1 && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : workingSchedules.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Tidak ada jadwal kerja 30 hari terakhir</div>
            ) : workingSchedules.map((s) => {
              const rel       = relativeDay(s.workDate);
              const hasAbsen  = Boolean(s.attendance?.checkIn || s.attendance?.checkOut);
              const ciTime    = fmtTime(s.attendance?.checkIn  ?? null);
              const coTime    = fmtTime(s.attendance?.checkOut ?? null);

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSchedule(s)}
                  className="w-full flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
                >
                  {/* date badge */}
                  <div className={`flex flex-col items-center justify-center rounded-lg w-12 h-12 shrink-0 ${hasAbsen ? "bg-emerald-50" : "bg-red-50"}`}>
                    <span className={`text-lg font-bold leading-none ${hasAbsen ? "text-emerald-700" : "text-red-600"}`}>
                      {new Date(s.workDate).getDate()}
                    </span>
                    <span className={`text-[10px] font-medium ${hasAbsen ? "text-emerald-500" : "text-red-400"}`}>
                      {new Date(s.workDate).toLocaleDateString("id-ID", { month: "short" })}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800">
                        {new Date(s.workDate).toLocaleDateString("id-ID", { weekday: "long" })}
                      </p>
                      {rel && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{rel}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {hasAbsen
                        ? `Absen: ${ciTime ?? "—"} → ${coTime ?? "—"}`
                        : <span className="text-red-500 font-medium">Tidak ada absensi tercatat</span>
                      }
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 2: konfirmasi waktu ── */}
        {step === 2 && selected && (
          <div className="space-y-4">
            {/* info hari */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="font-medium text-slate-800">{fmtDateFull(selected.workDate)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {selected.shift ? `Shift: ${selected.shift.name}` : "Tidak ada shift"}
              </p>
            </div>

            {/* perbandingan absen lama vs baru */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tercatat</p>
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                  <p className="text-xs text-red-400">Check-in</p>
                  <p className="text-base font-bold text-red-600">
                    {fmtTime(selected.attendance?.checkIn ?? null) ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                  <p className="text-xs text-red-400">Check-out</p>
                  <p className="text-base font-bold text-red-600">
                    {fmtTime(selected.attendance?.checkOut ?? null) ?? "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Yang Benar</p>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                  <p className="text-xs text-emerald-500 mb-1">Check-in</p>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full text-base font-bold text-emerald-700 bg-transparent border-0 p-0 focus:outline-none"
                  />
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                  <p className="text-xs text-emerald-500 mb-1">Check-out</p>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full text-base font-bold text-emerald-700 bg-transparent border-0 p-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {(!checkInTime && !checkOutTime) && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Isi minimal satu waktu yang benar
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3: pilih alasan ── */}
        {step === 3 && (
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r === reason ? "" : r)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all active:scale-[0.98]
                  ${reason === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                  ${reason === r ? "border-primary bg-primary" : "border-slate-300"}`}>
                  {reason === r && <Check className="h-3 w-3 text-white" />}
                </span>
                {r}
              </button>
            ))}

            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-1.5">Atau tulis sendiri:</p>
              <Input
                placeholder="Alasan lain..."
                value={customReason}
                onChange={(e) => { setCustomReason(e.target.value); if (e.target.value) setReason(""); }}
                className="text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => (s - 1) as 1|2|3)}>
              Kembali
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleClose}>Batal</Button>
          {step === 2 && (
            <Button size="sm" onClick={() => setStep(3)} disabled={!checkInTime && !checkOutTime}>
              Lanjut
            </Button>
          )}
          {step === 3 && (
            <Button size="sm" onClick={handleSubmit} disabled={createMut.isPending || (!reason && !customReason)}>
              {createMut.isPending ? "Mengirim..." : "Kirim Koreksi"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Review dialog (admin) ─────────────────────────────────────────────────────

function ReviewDialog({ item, onClose }: { item: CorrectionRequest | null; onClose: () => void }) {
  const [status, setStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [note, setNote]     = useState("");
  const reviewMut           = useReviewCorrection(item?.id ?? "");

  async function handleSubmit() {
    if (!item) return;
    await reviewMut.mutateAsync({ status, reviewNote: note || undefined });
    onClose();
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Review Koreksi</DialogTitle></DialogHeader>
        {item && (
          <div className="space-y-4 py-1">
            <div className="rounded-xl bg-slate-50 border p-4 space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Karyawan</span><span className="font-medium">{item.employee.name}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Tanggal</span><span>{item.staffSchedule ? fmtDateShort(item.staffSchedule.workDate) : "—"}</span></div>
              {item.requestedCheckIn  && <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Check-in diminta</span><span className="font-medium text-emerald-700">{fmtTime(item.requestedCheckIn)}</span></div>}
              {item.requestedCheckOut && <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Check-out diminta</span><span className="font-medium text-emerald-700">{fmtTime(item.requestedCheckOut)}</span></div>}
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Alasan</span><span>{item.reason}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStatus("APPROVED")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors
                  ${status === "APPROVED" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Check className="h-4 w-4" /> Setujui
              </button>
              <button onClick={() => setStatus("REJECTED")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors
                  ${status === "REJECTED" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <X className="h-4 w-4" /> Tolak
              </button>
            </div>

            <Input placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={reviewMut.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={reviewMut.isPending}>
            {reviewMut.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminView() {
  const [reviewItem, setReviewItem]     = useState<CorrectionRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<CorrectionStatus | "">("");
  const { data, isLoading }             = useCorrections({ status: filterStatus || undefined, limit: 50 });
  const items   = data?.data ?? [];
  const pending = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{pending}</strong> koreksi kehadiran menunggu review</span>
        </div>
      )}
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as CorrectionStatus | "")}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 focus:outline-none">
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REJECTED">Ditolak</option>
      </select>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Tidak ada permintaan koreksi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/70">
                  {["Karyawan","Tanggal","Waktu Diminta","Alasan","Status",""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{item.employee.name}</p>
                      <p className="text-xs text-slate-400">{item.employee.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {item.staffSchedule ? fmtDateShort(item.staffSchedule.workDate) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 space-y-0.5">
                      {item.requestedCheckIn  && <div>In: <span className="font-medium">{fmtTime(item.requestedCheckIn)}</span></div>}
                      {item.requestedCheckOut && <div>Out: <span className="font-medium">{fmtTime(item.requestedCheckOut)}</span></div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[160px] truncate">{item.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewItem(item)}>Review</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ReviewDialog item={reviewItem} onClose={() => setReviewItem(null)} />
    </div>
  );
}

// ── Employee view ─────────────────────────────────────────────────────────────

function MyView() {
  const [open, setOpen]     = useState(false);
  const { data, isLoading } = useMyCorrections({ limit: 50 });
  const items               = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Riwayat koreksi absensi kamu</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajukan Koreksi
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border bg-white py-14 text-center shadow-sm">
          <Clock className="mb-3 h-9 w-9 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">Belum ada koreksi</p>
          <p className="mt-1 text-xs text-slate-400">Tekan tombol di atas jika absensi kamu perlu dikoreksi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white shadow-sm px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {item.staffSchedule ? fmtDateFull(item.staffSchedule.workDate) : "—"}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    {item.requestedCheckIn  && <span>In: <span className="font-medium text-slate-700">{fmtTime(item.requestedCheckIn)}</span></span>}
                    {item.requestedCheckOut && <span>Out: <span className="font-medium text-slate-700">{fmtTime(item.requestedCheckOut)}</span></span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.reason}</p>
                  {item.reviewNote && (
                    <p className="mt-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600">
                      Catatan: {item.reviewNote}
                    </p>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CorrectionPage() {
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const isAdmin  = ADMIN_ROLES.includes(roleCode ?? "");

  return (
    <PageContainer>
      <div className="space-y-1 mb-5">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isAdmin ? "Koreksi Kehadiran" : "Koreksi Kehadiran Saya"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Review dan setujui permintaan koreksi kehadiran karyawan"
            : "Ajukan koreksi jika absensi kamu tidak terekam dengan benar"}
        </p>
      </div>
      {isAdmin ? <AdminView /> : <MyView />}
    </PageContainer>
  );
}
