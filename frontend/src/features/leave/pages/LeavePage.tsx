import { useState } from "react";
import { Plus, CalendarDays, AlertTriangle, X, CheckCircle, XCircle } from "lucide-react";
import { EmptyState }     from "@/components/common/EmptyState";
import { PageContainer }  from "@/components/layout/PageContainer";
import { Button }         from "@/components/ui/button";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton }       from "@/components/ui/skeleton";

import { useAuthStore }   from "@/stores/authStore";
import {
  useLeaves, useMyLeaves,
  useCreateLeave, useApproveLeave, useRejectLeave, useCancelLeave,
} from "../hooks";
import { useLeaveTypes, useMyLeaveQuotas } from "@/features/settings/hooks";
import type { Leave, LeaveStatus, CreateLeaveInput } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

// OFFICE punya approval cuti sesuai access matrix
const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "OFFICE"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const diffDays = (start: string, end: string) =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;

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
];

// ── Review dialog (admin approve / reject) ────────────────────────────────────

function ReviewDialog({ leave, onClose }: { leave: Leave; onClose: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const approveMut = useApproveLeave();
  const rejectMut  = useRejectLeave();
  const pending    = approveMut.isPending || rejectMut.isPending;
  const days       = diffDays(leave.startDate, leave.endDate);

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
            <span className="ml-1 text-xs">({days} hari)</span>
          </p>
          {leave.leaveType && (
            <p className="text-xs font-medium text-slate-600">{leave.leaveType.name}</p>
          )}
          {leave.reason && <p className="text-muted-foreground">{leave.reason}</p>}
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
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<CreateLeaveInput>({ startDate: today, endDate: today, reason: "", leaveTypeId: "" });
  const [error, setError] = useState<string | null>(null);
  const createMut  = useCreateLeave();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const year = form.startDate ? new Date(form.startDate).getFullYear() : new Date().getFullYear();
  const { data: myQuotas = [] } = useMyLeaveQuotas(year);

  const days = form.startDate && form.endDate ? diffDays(form.startDate, form.endDate) : 0;
  const selectedQuota = form.leaveTypeId
    ? myQuotas.find((q) => q.leaveTypeId === form.leaveTypeId) ?? null
    : null;

  async function handleSubmit() {
    if (!form.startDate || !form.endDate) return;
    if (form.endDate < form.startDate) return;
    setError(null);
    try {
      await createMut.mutateAsync({
        ...form,
        reason:      form.reason || undefined,
        leaveTypeId: form.leaveTypeId || undefined,
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
              <Label className="text-xs font-medium">Tipe Cuti</Label>
              <select
                value={form.leaveTypeId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
              >
                <option value="">Tidak dipilih</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
              {selectedQuota && (
                <p className="text-xs text-slate-500">
                  Sisa kuota:{" "}
                  <span className={`font-semibold ${
                    selectedQuota.totalDays - selectedQuota.usedDays <= 0
                      ? "text-red-600"
                      : "text-emerald-700"
                  }`}>
                    {selectedQuota.totalDays - selectedQuota.usedDays} hari
                  </span>{" "}dari {selectedQuota.totalDays} hari
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Mulai <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Selesai <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.endDate} min={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs text-slate-500 -mt-1">
              Durasi: <span className="font-semibold text-slate-700">{days} hari</span>
            </p>
          )}
          {form.endDate < form.startDate && (
            <p className="text-xs text-red-500">Tanggal selesai harus setelah tanggal mulai</p>
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
            disabled={createMut.isPending || !form.startDate || !form.endDate || form.endDate < form.startDate}>
            {createMut.isPending ? "Mengirim…" : "Ajukan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave card ────────────────────────────────────────────────────────────────

function LeaveCard({
  leave, isAdmin, onReview, onCancel, currentEmployeeId,
}: {
  leave:             Leave;
  isAdmin:           boolean;
  onReview:          (l: Leave) => void;
  onCancel:          (id: string) => void;
  currentEmployeeId: string | null | undefined;
}) {
  const days      = diffDays(leave.startDate, leave.endDate);
  const canCancel = !isAdmin && leave.employeeId === currentEmployeeId && leave.status === "PENDING";

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
            <span className="text-xs text-muted-foreground">({days} hari)</span>
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
              onClick={() => onCancel(leave.id)}>
              Batalkan
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {isAdmin
          ? `Cabang: ${leave.employee?.homeBranch?.name ?? "—"} · Diajukan ${new Date(leave.createdAt).toLocaleDateString("id-ID")}`
          : `Diajukan ${new Date(leave.createdAt).toLocaleDateString("id-ID")}`}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LeavePage() {
  const { user }     = useAuthStore();
  const roleCode     = user?.roleCode;
  const isAdmin      = ADMIN_ROLES.includes(roleCode ?? "");
  const employeeId   = user?.employeeId;

  const [filterStatus,  setFilterStatus ] = useState<LeaveStatus | "">("");
  const [createOpen,    setCreateOpen   ] = useState(false);
  const [reviewing,     setReviewing    ] = useState<Leave | null>(null);

  const adminQuery = useLeaves({
    status: filterStatus || undefined,
    limit:  50,
  });
  const myQuery = useMyLeaves({
    status: filterStatus || undefined,
    limit:  50,
  });

  const query  = isAdmin ? adminQuery : myQuery;
  const items  = query.data?.data ?? [];
  const pending = items.filter((l) => l.status === "PENDING").length;

  const cancelMut = useCancelLeave();
  const year      = new Date().getFullYear();
  const { data: myQuotas = [] } = useMyLeaveQuotas(isAdmin ? 0 : year);

  async function handleCancel(id: string) {
    try { await cancelMut.mutateAsync(id); } catch { /* errors surfaced globally */ }
  }

  return (
    <PageContainer
      title={isAdmin ? "Manajemen Cuti" : "Cuti Saya"}
      subtitle={isAdmin
        ? "Kelola dan setujui pengajuan cuti karyawan"
        : "Ajukan dan lihat riwayat cuti kamu"}
      action={
        !isAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajukan Cuti
          </Button>
        ) : undefined
      }
    >
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
              const rem = q.totalDays - q.usedDays;
              return (
                <div key={q.id} className="flex-1 min-w-[140px] rounded-xl border bg-card px-4 py-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">{q.leaveType.name}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${
                    rem <= 0 ? "text-red-600" : rem <= 3 ? "text-amber-600" : "text-emerald-700"
                  }`}>{rem}</p>
                  <p className="text-xs text-muted-foreground">sisa dari {q.totalDays} hari</p>
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
                  : 'Tekan "Ajukan Cuti" untuk mulai'
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
                onCancel={handleCancel}
                currentEmployeeId={employeeId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {!isAdmin && (
        <RequestDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      )}
      {reviewing && (
        <ReviewDialog leave={reviewing} onClose={() => setReviewing(null)} />
      )}
    </PageContainer>
  );
}
