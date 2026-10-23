import { useState } from "react";
import { CalendarDays, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { EmptyState }     from "@/components/common/EmptyState";
import { Button }         from "@/components/ui/button";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton }       from "@/components/ui/skeleton";

import { useAuthStore }   from "@/stores/authStore";
import { canApprove } from "@/lib/access";
import {
  useLeaves, useMyLeaves,
  useCreateLeave, useApproveLeave, useRejectLeave, useCancelLeave,
  useCancelApprovedLeave, useLeaveWorkingDays,
} from "../hooks";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useLeaveTypes, useMyLeaveQuotas } from "@/features/settings/hooks";
import type { Leave, LeaveStatus, CreateLeaveInput } from "../types";
import { WIB_TZ, toWibDateStr, wibDateParts } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

// OFFICE punya approval cuti sesuai access matrix

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: WIB_TZ, day: "numeric", month: "short", year: "numeric" });

const diffDays = (start: string, end: string) =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;

/** Durasi cuti tersimpan = hari kerja (OFF & libur nasional tidak dihitung, keputusan user 2026-10-19) */
const leaveDays = (l: Leave) => l.totalDays ?? diffDays(l.startDate, l.endDate);

/** Tanggal (ISO) belum lewat menurut WIB */
const notPassed = (iso: string) => toWibDateStr(new Date(iso)) >= toWibDateStr();

const rangeLabel = (l: Leave) =>
  l.startDate === l.endDate ? fmtDate(l.startDate) : `${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}`;

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<LeaveStatus, { label: string; className: string }> = {
  PENDING:   { label: "Menunggu",   className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED:  { label: "Disetujui",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED:  { label: "Ditolak",    className: "bg-red-50 text-red-700 border border-red-200" },
  CANCELLED: { label: "Dibatalkan", className: "bg-slate-100 text-slate-500 border border-slate-200" },
};

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.REJECTED;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Filter pills ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: LeaveStatus | ""; label: string }[] = [
  { value: "",         label: "Semua" },
  { value: "PENDING",  label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

// ── Review dialog (admin approve / reject) ────────────────────────────────────

function ReviewDialog({ leave, onClose }: { leave: Leave; onClose: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const approveMut = useApproveLeave();
  const rejectMut  = useRejectLeave();
  const pending    = approveMut.isPending || rejectMut.isPending;
  const days       = leaveDays(leave);

  async function handle(action: "approve" | "reject") {
    setErr(null);
    try {
      if (action === "approve") await approveMut.mutateAsync(leave.id);
      else                      await rejectMut.mutateAsync(leave.id);
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Review Cuti</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm space-y-1">
          <p className="font-medium">{leave.employee?.name}</p>
          <p className="text-muted-foreground">
            {fmtDate(leave.startDate)}
            {leave.startDate !== leave.endDate && <> — {fmtDate(leave.endDate)}</>}
            <span className="ml-1 text-xs">({days} hari kerja)</span>
          </p>
          {leave.leaveType && (
            <p className="text-xs font-medium text-slate-600">{leave.leaveType.name}</p>
          )}
          {leave.reason && <p className="text-muted-foreground">{leave.reason}</p>}
          <p className="text-[11px] text-muted-foreground">Hari kerja dihitung ulang dari jadwal saat disetujui.</p>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="flex-1">
            Batal
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handle("reject")} disabled={pending} className="flex-1">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak
          </Button>
          <Button size="sm" onClick={() => handle("approve")} disabled={pending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Request form dialog (employee) ────────────────────────────────────────────

function RequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = toWibDateStr();
  const [form, setForm] = useState<CreateLeaveInput>({ startDate: today, endDate: today, reason: "", leaveTypeId: "" });
  const [error, setError] = useState<string | null>(null);
  const createMut  = useCreateLeave();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const year = form.startDate ? Number(form.startDate.slice(0, 4)) : wibDateParts().year;
  const { data: myQuotas = [] } = useMyLeaveQuotas(year);

  const validRange = !!form.startDate && !!form.endDate && form.endDate >= form.startDate;
  const backdated  = !!form.startDate && form.startDate < today;
  // Durasi = hari kerja (hari OFF & libur nasional tidak memakai jatah) — dihitung server dari jadwal
  const wd = useLeaveWorkingDays(form.startDate, form.endDate, open && validRange && !backdated);
  const days = wd.data?.totalDays ?? 0;
  const selectedQuota = form.leaveTypeId
    ? myQuotas.find((q) => q.leaveTypeId === form.leaveTypeId) ?? null
    : null;
  // Sisa jatah = jatah − terpakai − pengajuan lain yang masih menunggu (keputusan user 2026-10-15)
  const remaining   = selectedQuota ? (selectedQuota.remainingDays ?? selectedQuota.totalDays - selectedQuota.usedDays) : null;
  const noQuota     = !!form.leaveTypeId && !selectedQuota;
  const overQuota   = remaining !== null && days > remaining;
  const canSubmit   = !!form.leaveTypeId && !noQuota && !overQuota
    && validRange && !backdated && !!wd.data && days > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await createMut.mutateAsync({
        ...form,
        reason:      form.reason || undefined,
        leaveTypeId: form.leaveTypeId,
      });
      onClose();
      setForm({ startDate: today, endDate: today, reason: "", leaveTypeId: "" });
    } catch (err) { setError(apiErr(err)); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajukan Cuti</DialogTitle>
          <DialogDescription className="text-xs">
            Pengajuan akan dikirim ke manager untuk disetujui.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {leaveTypes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Jenis Cuti <span className="text-destructive">*</span></Label>
              <select
                value={form.leaveTypeId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
              >
                <option value="" disabled>— Pilih jenis cuti —</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
              {selectedQuota && remaining !== null && (
                <div className="rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                  Sisa jatah cuti {form.startDate.slice(0, 4)}:{" "}
                  <span className={`font-semibold ${remaining <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {remaining} hari
                  </span>{" "}dari {selectedQuota.totalDays} hari
                  <span className="block text-[11px] text-slate-500">
                    Terpakai {selectedQuota.usedDays} hari
                    {(selectedQuota.pendingDays ?? 0) > 0 && ` · ${selectedQuota.pendingDays} hari menunggu persetujuan`}
                  </span>
                </div>
              )}
              {noQuota && (
                <p className="text-xs text-red-600">Jatah cuti jenis ini belum ditetapkan untuk tahun {form.startDate.slice(0, 4)}. Hubungi HRD.</p>
              )}
              {!form.leaveTypeId && (
                <p className="text-xs text-muted-foreground">Pilih jenis cuti untuk melihat sisa jatah.</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Mulai <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} min={today}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, startDate: v, endDate: f.endDate < v ? v : f.endDate }));
                }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Selesai <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.endDate} min={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          {validRange && !backdated && (
            <p className="text-xs text-slate-500 -mt-1">
              {wd.isLoading ? "Menghitung hari kerja…" : wd.isError ? (
                <span className="text-red-600">{apiErr(wd.error)}</span>
              ) : wd.data ? (
                <>
                  Durasi: <span className="font-semibold text-slate-700">{days} hari kerja</span>
                  {(wd.data.offDays > 0 || wd.data.holidayDays > 0) && (
                    <span className="block text-[11px] text-slate-500">
                      dari {wd.data.calendarDays} hari kalender
                      {wd.data.offDays > 0 && ` · ${wd.data.offDays} hari OFF`}
                      {wd.data.holidayDays > 0 && ` · ${wd.data.holidayDays} hari libur nasional`}
                      {" "}tidak memakai jatah
                    </span>
                  )}
                </>
              ) : null}
            </p>
          )}
          {wd.data && days === 0 && validRange && (
            <p className="text-xs text-red-600">Semua tanggal yang dipilih adalah hari OFF / libur nasional — tidak perlu cuti.</p>
          )}
          {backdated && (
            <p className="text-xs text-red-500">Cuti hanya bisa diajukan mulai hari ini atau tanggal setelahnya</p>
          )}
          {form.endDate < form.startDate && (
            <p className="text-xs text-red-500">Tanggal selesai harus setelah tanggal mulai</p>
          )}
          {overQuota && (
            <p className="text-xs text-red-600">Durasi {days} hari kerja melebihi sisa jatah ({remaining} hari).</p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Alasan</Label>
            <Input placeholder="Opsional" value={form.reason ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={createMut.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit}
            disabled={createMut.isPending || !canSubmit}>
            {createMut.isPending ? "Mengirim…" : "Ajukan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave card ────────────────────────────────────────────────────────────────

function LeaveCard({
  leave, isAdmin, onReview, onCancel, onRevoke, currentEmployeeId,
}: {
  leave:             Leave;
  isAdmin:           boolean;
  onReview:          (l: Leave) => void;
  onCancel:          (l: Leave) => void;
  onRevoke:          (l: Leave) => void;
  currentEmployeeId: string | null | undefined;
}) {
  const days      = leaveDays(leave);
  const canCancel = !isAdmin && leave.employeeId === currentEmployeeId && leave.status === "PENDING";
  // Cuti yang sudah disetujui dan belum dimulai bisa dibatalkan penyetuju (keputusan user 2026-10-19)
  const canRevoke = isAdmin && leave.status === "APPROVED" && notPassed(leave.startDate);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isAdmin && (
            <p className="font-semibold text-sm">
              {leave.employee?.name}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {leave.employee?.role.name}
              </span>
            </p>
          )}
          <div className={`flex items-center gap-1.5 ${isAdmin ? "mt-0.5" : ""}`}>
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="font-medium text-sm">
              {fmtDate(leave.startDate)}
              {leave.startDate !== leave.endDate && <> — {fmtDate(leave.endDate)}</>}
            </p>
            <span className="text-xs text-muted-foreground">({days} hari kerja)</span>
          </div>
          {leave.leaveType && (
            <p className="mt-0.5 text-xs font-medium text-slate-600">{leave.leaveType.name}</p>
          )}
          {leave.reason && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{leave.reason}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={leave.status} />
          {leave.status === "PENDING" && isAdmin && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReview(leave)}>
              Review
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancel(leave)}>
              Batalkan
            </Button>
          )}
          {canRevoke && (
            <Button size="sm" variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onRevoke(leave)}>
              Batalkan Cuti
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {isAdmin
          ? `Cabang: ${leave.employee?.homeBranch?.name ?? "—"} · Diajukan ${new Date(leave.createdAt).toLocaleDateString("id-ID", { timeZone: WIB_TZ })}`
          : `Diajukan ${new Date(leave.createdAt).toLocaleDateString("id-ID", { timeZone: WIB_TZ })}`}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

/** Panel pengajuan — dipakai di halaman Pengajuan. Dialog "Ajukan" dikontrol parent. */
export function LeavePanel({ createOpen, onCreateClose, asApprover }: { createOpen: boolean; onCreateClose: () => void; asApprover?: boolean }) {
  const { user }     = useAuthStore();
  const isAdmin      = asApprover ?? canApprove(user);
  const employeeId   = user?.employeeId;

  const [filterStatus,  setFilterStatus ] = useState<LeaveStatus | "">("");
  const [reviewing,     setReviewing    ] = useState<Leave | null>(null);
  const [cancelling,    setCancelling   ] = useState<Leave | null>(null);
  const [revoking,      setRevoking     ] = useState<Leave | null>(null);

  const adminQuery = useLeaves({
    status: filterStatus || undefined,
    limit:  50,
  }, isAdmin);
  const myQuery = useMyLeaves({
    status: filterStatus || undefined,
    limit:  50,
  }, !isAdmin);

  const query  = isAdmin ? adminQuery : myQuery;
  const items  = query.data?.data ?? [];
  const pending = items.filter((l) => l.status === "PENDING").length;

  const cancelMut = useCancelLeave();
  const revokeMut = useCancelApprovedLeave();
  const year      = wibDateParts().year;
  const { data: myQuotas = [] } = useMyLeaveQuotas(isAdmin ? 0 : year);

  async function handleCancel() {
    if (!cancelling) return;
    try { await cancelMut.mutateAsync(cancelling.id); } catch { /* galat ditampilkan via toast */ }
    setCancelling(null);
  }

  async function handleRevoke() {
    if (!revoking) return;
    try { await revokeMut.mutateAsync(revoking.id); } catch { /* galat ditampilkan via toast */ }
    setRevoking(null);
  }

  return (
    <>
      <div className="space-y-5">

        {/* Pending warning (admin) */}
        {isAdmin && pending > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{pending}</strong> pengajuan cuti menunggu persetujuan</span>
          </div>
        )}

        {/* Quota cards (employee) */}
        {!isAdmin && myQuotas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {myQuotas.map((q) => {
              // Sisa = jatah − terpakai − menunggu persetujuan
              const rem = q.remainingDays ?? q.totalDays - q.usedDays;
              return (
                <div key={q.id} className="flex-1 min-w-[140px] rounded-xl border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">{q.leaveType.name}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${
                    rem <= 0 ? "text-red-600" : rem <= 3 ? "text-amber-600" : "text-emerald-700"
                  }`}>{rem}</p>
                  <p className="text-xs text-muted-foreground">sisa dari {q.totalDays} hari</p>
                  {(q.pendingDays ?? 0) > 0 && (
                    <p className="text-[11px] text-amber-600">{q.pendingDays} hari menunggu persetujuan</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterStatus === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="w-6 h-6" />}
            title="Belum ada pengajuan cuti"
            description={
              filterStatus
                ? "Tidak ada pengajuan dengan status ini"
                : isAdmin
                  ? "Belum ada pengajuan cuti dari karyawan"
                  : 'Tekan "Ajukan" lalu pilih Cuti untuk mulai'
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((leave) => (
              <LeaveCard
                key={leave.id}
                leave={leave}
                isAdmin={isAdmin}
                onReview={setReviewing}
                onCancel={setCancelling}
                onRevoke={setRevoking}
                currentEmployeeId={employeeId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {!isAdmin && (
        <RequestDialog open={createOpen} onClose={() => onCreateClose()} />
      )}
      {reviewing && (
        <ReviewDialog leave={reviewing} onClose={() => setReviewing(null)} />
      )}
      <ConfirmDialog
        open={!!cancelling}
        title="Batalkan pengajuan cuti?"
        description={cancelling ? `Pengajuan cuti ${rangeLabel(cancelling)} akan dibatalkan dan tidak bisa dikembalikan.` : undefined}
        isPending={cancelMut.isPending}
        onConfirm={handleCancel}
        onClose={() => setCancelling(null)}
      />
      <ConfirmDialog
        open={!!revoking}
        title="Batalkan cuti yang sudah disetujui?"
        description={revoking ? (
          <>
            Cuti <strong>{revoking.employee?.name}</strong> {rangeLabel(revoking)} ({leaveDays(revoking)} hari kerja) dibatalkan:
            jatah dikembalikan, jadwal dipulihkan, dan karyawan diberi notifikasi.
          </>
        ) : undefined}
        confirmLabel="Ya, Batalkan Cuti"
        isPending={revokeMut.isPending}
        onConfirm={handleRevoke}
        onClose={() => setRevoking(null)}
      />
    </>
  );
}
