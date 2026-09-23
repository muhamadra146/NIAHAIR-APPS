import { useState } from "react";
import { Plus, CheckCircle, XCircle, AlertTriangle, CalendarDays, Clock } from "lucide-react";
import { EmptyState }    from "@/components/common/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button }        from "@/components/ui/button";
import { Input }         from "@/components/ui/input";
import { Label }         from "@/components/ui/label";
import { Skeleton }      from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore }  from "@/stores/authStore";
import {
  useMyPermissions, usePermissions,
  useCreatePermission, useApprovePermission, useRejectPermission, useCancelPermission,
} from "../hooks";
import type { PermissionRequest, PermissionType } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

// OFFICE punya Approval/Verifikasi sesuai access matrix
const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "OFFICE"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PermissionRequest["status"] }) {
  if (status === "APPROVED")
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Disetujui</span>;
  if (status === "REJECTED")
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Ditolak</span>;
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Menunggu</span>;
}

function TypeBadge({ type }: { type: PermissionType }) {
  if (type === "LATE")
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700">Izin Terlambat</span>;
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">Tidak Hadir</span>;
}

// ── Filter pills ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "",         label: "Semua" },
  { value: "PENDING",  label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
] as const;

// ── Review dialog (admin) ─────────────────────────────────────────────────────

function ReviewDialog({ perm, onClose }: { perm: PermissionRequest; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [err,  setErr ] = useState<string | null>(null);
  const approveMut = useApprovePermission();
  const rejectMut  = useRejectPermission();
  const pending    = approveMut.isPending || rejectMut.isPending;

  async function handle(action: "approve" | "reject") {
    setErr(null);
    try {
      if (action === "approve")
        await approveMut.mutateAsync({ id: perm.id, input: { reviewNote: note || undefined } });
      else
        await rejectMut.mutateAsync({ id: perm.id, input: { reviewNote: note || undefined } });
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Review Izin</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{perm.employee.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{perm.employee.role?.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <TypeBadge type={perm.type} />
            </div>
            <p className="text-muted-foreground">{fmtDate(perm.date)}</p>
            {perm.type === "LATE" && perm.estimatedArrival && (
              <p className="text-muted-foreground">
                Estimasi datang: <span className="font-medium">{perm.estimatedArrival}</span>
              </p>
            )}
            <p className="text-muted-foreground">Alasan: {perm.reason}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Catatan (opsional)</Label>
            <Input
              placeholder="Catatan untuk karyawan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="flex-1">Batal</Button>
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

// ── Create dialog (employee) ──────────────────────────────────────────────────

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [type,             setType            ] = useState<PermissionType>("ABSENCE");
  const [date,             setDate            ] = useState(today);
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [reason,           setReason          ] = useState("");
  const [notes,            setNotes           ] = useState("");
  const [err,              setErr             ] = useState<string | null>(null);
  const createMut = useCreatePermission();

  function reset() {
    setType("ABSENCE"); setDate(today); setEstimatedArrival("");
    setReason(""); setNotes(""); setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setErr("Alasan wajib diisi"); return; }
    if (type === "LATE" && !estimatedArrival) { setErr("Estimasi jam datang wajib diisi"); return; }
    setErr(null);
    try {
      await createMut.mutateAsync({
        type,
        date,
        reason: reason.trim(),
        notes:  notes.trim() || undefined,
        ...(type === "LATE" && { estimatedArrival }),
      });
      reset();
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajukan Izin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Jenis Izin <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ABSENCE", "LATE"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t === "ABSENCE" ? "Tidak Hadir" : "Izin Terlambat"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal <span className="text-destructive">*</span></Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} />
          </div>

          {type === "LATE" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Estimasi Jam Datang <span className="text-destructive">*</span></Label>
              <Input
                type="time"
                value={estimatedArrival}
                onChange={(e) => setEstimatedArrival(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Alasan <span className="text-destructive">*</span></Label>
            <Input
              placeholder={type === "LATE"
                ? "cth: Ban bocor, macet parah..."
                : "cth: Urusan keluarga, Keperluan pribadi..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Keterangan Tambahan</Label>
            <Input
              placeholder="Opsional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose(); }}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Mengajukan..." : "Ajukan Izin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Permission card ───────────────────────────────────────────────────────────

function PermissionCard({
  perm, isAdmin, onReview, onCancel,
}: {
  perm:     PermissionRequest;
  isAdmin:  boolean;
  onReview: (p: PermissionRequest) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isAdmin && (
            <p className="font-semibold text-sm">
              {perm.employee.name}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {perm.employee.role?.name}
              </span>
            </p>
          )}
          <div className={`flex items-center gap-2 flex-wrap ${isAdmin ? "mt-0.5" : ""}`}>
            <p className="font-medium text-sm">{fmtDate(perm.date)}</p>
            <TypeBadge type={perm.type} />
          </div>
          {perm.type === "LATE" && perm.estimatedArrival && (
            <p className="mt-0.5 text-xs text-orange-600 font-medium">
              Estimasi datang: {perm.estimatedArrival}
            </p>
          )}
          <p className="mt-0.5 text-sm text-muted-foreground">{perm.reason}</p>
          {perm.notes && (
            <p className="mt-0.5 text-xs text-muted-foreground italic">{perm.notes}</p>
          )}
          {perm.reviewNote && (
            <p className="mt-1 text-xs rounded-md bg-muted/50 px-2 py-1">
              Catatan: {perm.reviewNote}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={perm.status} />
          {perm.status === "PENDING" && isAdmin && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReview(perm)}>
              Review
            </Button>
          )}
          {perm.status === "PENDING" && !isAdmin && (
            <Button size="sm" variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancel(perm.id)}>
              Batalkan
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Cabang: {perm.branch.name} · Diajukan {new Date(perm.createdAt).toLocaleDateString("id-ID")}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PermissionPage() {
  const { user } = useAuthStore();
  const isAdmin  = ADMIN_ROLES.includes(user?.role?.code ?? "");

  const [createOpen,   setCreateOpen ] = useState(false);
  const [reviewing,    setReviewing  ] = useState<PermissionRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const myQuery  = useMyPermissions({ status: (statusFilter as PermissionRequest["status"]) || undefined });
  const allQuery = usePermissions({ status: (statusFilter as PermissionRequest["status"]) || undefined });
  const query    = isAdmin ? allQuery : myQuery;
  const items    = query.data?.data ?? [];

  const pending    = items.filter((p) => p.status === "PENDING").length;
  const cancelMut  = useCancelPermission();

  async function handleCancel(id: string) {
    try { await cancelMut.mutateAsync(id); } catch { /* errors surfaced globally */ }
  }

  return (
    <PageContainer
      className="max-w-3xl"
      title="Pengajuan Izin"
      subtitle={isAdmin ? "Kelola izin ketidakhadiran karyawan" : "Ajukan dan pantau izin kamu"}
      action={
        !isAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajukan Izin
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">

        {/* Pending warning (admin) */}
        {isAdmin && pending > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{pending}</strong> pengajuan izin menunggu persetujuan</span>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                statusFilter === opt.value
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
            icon={<Clock className="w-6 h-6" />}
            title="Belum ada pengajuan izin"
            description={
              statusFilter
                ? "Tidak ada pengajuan dengan status ini"
                : isAdmin
                  ? "Belum ada pengajuan izin dari karyawan"
                  : 'Tekan "Ajukan Izin" untuk mulai'
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((perm) => (
              <PermissionCard
                key={perm.id}
                perm={perm}
                isAdmin={isAdmin}
                onReview={setReviewing}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {reviewing && (
        <ReviewDialog perm={reviewing} onClose={() => setReviewing(null)} />
      )}
    </PageContainer>
  );
}
