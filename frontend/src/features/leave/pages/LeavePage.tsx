import { useState } from "react";
import { Plus, Check, X, Trash2, CalendarDays, Clock, AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

import { useAuthStore } from "@/stores/authStore";
import {
  useLeaves, useMyLeaves, useCreateLeave, useApproveLeave, useRejectLeave, useCancelLeave,
} from "../hooks";
import { useLeaveTypes, useMyLeaveQuotas } from "@/features/settings/hooks";
import type { Leave, LeaveStatus, CreateLeaveInput } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const diffDays = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
};

const STATUS_CFG: Record<LeaveStatus, { label: string; className: string }> = {
  PENDING:  { label: "Menunggu",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED: { label: "Ditolak",   className: "bg-red-50 text-red-700 border border-red-200" },
};

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Request Form Dialog ───────────────────────────────────────────────────────

function RequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<CreateLeaveInput>({ startDate: today, endDate: today, reason: "", leaveTypeId: "" });
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateLeave();
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
    } catch (err) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error ? err.message : null;
      setError(msg ?? "Gagal mengajukan cuti");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajukan Cuti</DialogTitle>
          <DialogDescription className="text-xs">Pengajuan akan dikirim ke manager untuk disetujui.</DialogDescription>
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
                  Sisa kuota: <span className={`font-semibold ${selectedQuota.totalDays - selectedQuota.usedDays <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {selectedQuota.totalDays - selectedQuota.usedDays} hari
                  </span>{" "}dari {selectedQuota.totalDays} hari
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Mulai *</Label>
              <Input type="date" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Selesai *</Label>
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

// ── Leave row card (mobile) / table row (desktop) ─────────────────────────────

function LeaveRow({
  leave, isAdmin, onApprove, onReject, onCancel, currentEmployeeId,
}: {
  leave: Leave;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  onCancel:  (id: string) => void;
  currentEmployeeId: string | null | undefined;
}) {
  const canCancel = !isAdmin && leave.employeeId === currentEmployeeId && leave.status === "PENDING";
  const days = diffDays(leave.startDate, leave.endDate);

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      {isAdmin && (
        <td className="px-4 py-3">
          <p className="font-medium text-slate-800 text-sm">{leave.employee?.name ?? "—"}</p>
          <p className="text-xs text-slate-400">{leave.employee?.role.name}</p>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-slate-700">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{fmtDate(leave.startDate)}</span>
          {leave.startDate !== leave.endDate && (
            <><span className="text-slate-300">→</span><span>{fmtDate(leave.endDate)}</span></>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 ml-5">{days} hari</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={leave.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 max-w-[160px]">
        {leave.leaveType && (
          <p className="text-xs font-medium text-slate-700 truncate">{leave.leaveType.name}</p>
        )}
        <p className="truncate">{leave.reason || <span className="text-slate-300 italic">—</span>}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {isAdmin && leave.status === "PENDING" && (
            <>
              <button
                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                onClick={() => onApprove(leave.id)}
              >
                <Check className="h-3 w-3" /> Setuju
              </button>
              <button
                className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                onClick={() => onReject(leave.id)}
              >
                <X className="h-3 w-3" /> Tolak
              </button>
            </>
          )}
          {canCancel && (
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={() => onCancel(leave.id)}
              title="Batalkan"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminView() {
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | "">("");
  const { data, isLoading } = useLeaves({ status: filterStatus || undefined, limit: 50 });
  const approveMut = useApproveLeave();
  const rejectMut  = useRejectLeave();
  const leaves     = data?.data ?? [];

  const pending   = leaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{pending}</strong> pengajuan cuti menunggu persetujuan</span>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeaveStatus | "")}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 focus-visible:outline-none"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400">Tidak ada pengajuan cuti</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {["Karyawan", "Tanggal", "Status", "Alasan", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <LeaveRow
                    key={leave.id} leave={leave} isAdmin={true}
                    onApprove={(id) => approveMut.mutate(id)}
                    onReject={(id)  => rejectMut.mutate(id)}
                    onCancel={() => {}}
                    currentEmployeeId={null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Employee self view ────────────────────────────────────────────────────────

function MyLeaveView() {
  const [open, setOpen] = useState(false);
  const employeeId = useAuthStore((s) => s.user?.employeeId);
  const { data, isLoading } = useMyLeaves({ limit: 50 });
  const cancelMut  = useCancelLeave();
  const leaves     = data?.data ?? [];
  const year       = new Date().getFullYear();
  const { data: myQuotas = [] } = useMyLeaveQuotas(year);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Riwayat pengajuan cuti kamu</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajukan Cuti
        </Button>
      </div>

      {myQuotas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {myQuotas.map((q) => {
            const rem = q.totalDays - q.usedDays;
            return (
              <div key={q.id} className="flex-1 min-w-[140px] rounded-xl border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">{q.leaveType.name}</p>
                <p className={`mt-1 text-2xl font-bold ${rem <= 0 ? "text-red-600" : rem <= 3 ? "text-amber-600" : "text-emerald-700"}`}>
                  {rem}
                </p>
                <p className="text-xs text-slate-400">sisa dari {q.totalDays} hari</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <Clock className="mb-3 h-9 w-9 text-slate-200" />
            <p className="text-sm font-medium text-slate-600">Belum ada pengajuan cuti</p>
            <p className="mt-1 text-xs text-slate-400">Tekan tombol "Ajukan Cuti" untuk mulai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {["Tanggal", "Status", "Alasan", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <LeaveRow
                    key={leave.id} leave={leave} isAdmin={false}
                    onApprove={() => {}} onReject={() => {}}
                    onCancel={(id) => cancelMut.mutate(id)}
                    currentEmployeeId={employeeId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RequestDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LeavePage() {
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const isAdmin  = ADMIN_ROLES.includes(roleCode ?? "");

  return (
    <PageContainer>
      <div className="space-y-1 mb-5">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isAdmin ? "Manajemen Cuti" : "Cuti Saya"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Kelola dan setujui pengajuan cuti karyawan" : "Ajukan dan lihat riwayat cuti kamu"}
        </p>
      </div>
      {isAdmin ? <AdminView /> : <MyLeaveView />}
    </PageContainer>
  );
}
