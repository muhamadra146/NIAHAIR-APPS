import { useState, useRef } from "react";
import { Plus, CheckCircle, XCircle, AlertTriangle, Thermometer, X, Paperclip, FileImage } from "lucide-react";
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
  useMySickLeaves, useSickLeaves,
  useCreateSickLeave, useApproveSickLeave, useRejectSickLeave, useCancelSickLeave,
  useUploadSickLeaveDocument,
} from "../hooks";
import type { SickLeave } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

// OFFICE punya Approval/Verifikasi sesuai access matrix
const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "OFFICE"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SickLeave["status"] }) {
  if (status === "APPROVED")
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Disetujui</span>;
  if (status === "REJECTED")
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Ditolak</span>;
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Menunggu</span>;
}

// ── Filter pills ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "",         label: "Semua" },
  { value: "PENDING",  label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
] as const;

// ── Photo lightbox ────────────────────────────────────────────────────────────

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 rounded-full bg-gray-800 p-1 text-white hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={url}
          alt="Foto Dokumen"
          className="max-h-[80dvh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

// ── Review dialog (admin) ─────────────────────────────────────────────────────

function ReviewDialog({
  sl, onClose, onViewPhoto,
}: {
  sl: SickLeave;
  onClose: () => void;
  onViewPhoto: (url: string) => void;
}) {
  const [note, setNote] = useState("");
  const [err,  setErr ] = useState<string | null>(null);
  const approveMut = useApproveSickLeave();
  const rejectMut  = useRejectSickLeave();
  const pending    = approveMut.isPending || rejectMut.isPending;

  async function handle(action: "approve" | "reject") {
    setErr(null);
    try {
      if (action === "approve")
        await approveMut.mutateAsync({ id: sl.id, input: { reviewNote: note || undefined } });
      else
        await rejectMut.mutateAsync({ id: sl.id, input: { reviewNote: note || undefined } });
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Review Sakit</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{sl.employee.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{sl.employee.role?.name}</span>
            </p>
            <p className="text-muted-foreground">
              {fmtDate(sl.startDate)} – {fmtDate(sl.endDate)}{" "}
              <span className="text-xs">({sl.totalDays} hari)</span>
            </p>
            <p className="text-muted-foreground">
              Surat dokter:{" "}
              <span className={sl.hasLetter ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {sl.hasLetter ? "Ada" : "Tidak ada"}
              </span>
            </p>
            {sl.doctorName && <p className="text-muted-foreground">Dokter: {sl.doctorName}</p>}
            {sl.diagnosis  && <p className="text-muted-foreground">Diagnosa: {sl.diagnosis}</p>}
            {sl.clinicName && <p className="text-muted-foreground">Klinik: {sl.clinicName}</p>}
            {sl.letterPhotoUrl && (
              <button
                type="button"
                onClick={() => onViewPhoto(sl.letterPhotoUrl!)}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
              >
                <FileImage className="h-3.5 w-3.5" /> Lihat Foto Dokumen
              </button>
            )}
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

function CreateDialog({
  open, onClose, noLetterCount,
}: {
  open: boolean;
  onClose: () => void;
  noLetterCount: number;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [startDate,  setStartDate ] = useState(today);
  const [endDate,    setEndDate   ] = useState(today);
  const [hasLetter,  setHasLetter ] = useState(false);
  const [letterDate, setLetterDate] = useState(today);
  const [doctorName, setDoctorName] = useState("");
  const [diagnosis,  setDiagnosis ] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [docFile,    setDocFile   ] = useState<File | null>(null);
  const [err,        setErr       ] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMut  = useCreateSickLeave();
  const uploadMut  = useUploadSickLeaveDocument();
  const isPending  = createMut.isPending || uploadMut.isPending;

  function reset() {
    setStartDate(today); setEndDate(today); setHasLetter(false);
    setLetterDate(today); setDoctorName(""); setDiagnosis("");
    setClinicName(""); setDocFile(null); setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (endDate < startDate) { setErr("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }
    setErr(null);
    try {
      const sl = await createMut.mutateAsync({
        startDate,
        endDate,
        hasLetter,
        ...(hasLetter && {
          letterDate: letterDate || undefined,
          doctorName: doctorName.trim() || undefined,
          diagnosis:  diagnosis.trim()  || undefined,
          clinicName: clinicName.trim() || undefined,
        }),
      });
      if (docFile) {
        await uploadMut.mutateAsync({ id: sl.id, file: docFile });
      }
      reset();
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajukan Sakit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* No-letter warning */}
          {!hasLetter && noLetterCount >= 1 && (
            <div className={`rounded-lg px-3 py-2.5 text-xs flex gap-2 ${
              noLetterCount >= 2
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {noLetterCount >= 2
                  ? "Kamu sudah mencapai batas 2x sakit tanpa surat tahun ini. Pengajuan tanpa surat tidak dapat diterima."
                  : "Kamu sudah 1x sakit tanpa surat tahun ini. Maksimal 2x per tahun."}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Mulai <span className="text-destructive">*</span></Label>
              <Input type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Selesai <span className="text-destructive">*</span></Label>
              <Input type="date" value={endDate} min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Letter toggle */}
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <input
              id="hasLetter"
              type="checkbox"
              checked={hasLetter}
              onChange={(e) => setHasLetter(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            <label htmlFor="hasLetter" className="text-sm cursor-pointer select-none">
              Ada surat keterangan dokter
            </label>
          </div>

          {hasLetter && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Surat</Label>
                <Input type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Dokter</Label>
                <Input placeholder="dr. ..." value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Diagnosa</Label>
                <Input placeholder="cth: Demam, Flu, ISPA..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Klinik / RS</Label>
                <Input placeholder="cth: Puskesmas Jaksel" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </div>
            </>
          )}

          {/* Document upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Foto Dokumen <span className="text-muted-foreground">(opsional)</span></Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            />
            {docFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <FileImage className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 flex-1 truncate">{docFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setDocFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Pilih foto surat dokter
              </button>
            )}
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose(); }}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Mengajukan..." : "Ajukan Sakit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sick leave card ───────────────────────────────────────────────────────────

function SickLeaveCard({
  sl, isAdmin, onReview, onCancel, onViewPhoto,
}: {
  sl:          SickLeave;
  isAdmin:     boolean;
  onReview:    (sl: SickLeave) => void;
  onCancel:    (id: string) => void;
  onViewPhoto: (url: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isAdmin && (
            <p className="font-semibold text-sm">
              {sl.employee.name}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {sl.employee.role?.name}
              </span>
            </p>
          )}
          <p className={`font-medium text-sm ${isAdmin ? "mt-0.5" : ""}`}>
            {fmtDate(sl.startDate)} – {fmtDate(sl.endDate)}
            <span className="ml-2 text-xs text-muted-foreground font-normal">({sl.totalDays} hari)</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              sl.hasLetter ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
            }`}>
              {sl.hasLetter ? "Ada surat dokter" : "Tanpa surat"}
            </span>
          </div>
          {sl.diagnosis && (
            <p className="mt-1 text-sm text-muted-foreground">Diagnosa: {sl.diagnosis}</p>
          )}
          {sl.doctorName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              dr. {sl.doctorName}{sl.clinicName ? ` — ${sl.clinicName}` : ""}
            </p>
          )}
          {sl.letterPhotoUrl && (
            <button
              type="button"
              onClick={() => onViewPhoto(sl.letterPhotoUrl!)}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <FileImage className="h-3 w-3" />
              Lihat Foto Dokumen
            </button>
          )}
          {sl.reviewNote && (
            <p className="mt-1 text-xs rounded-md bg-muted/50 px-2 py-1">
              Catatan: {sl.reviewNote}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={sl.status} />
          {sl.status === "PENDING" && isAdmin && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReview(sl)}>
              Review
            </Button>
          )}
          {sl.status === "PENDING" && !isAdmin && (
            <Button size="sm" variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onCancel(sl.id)}>
              Batalkan
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Cabang: {sl.branch.name} · Diajukan {new Date(sl.createdAt).toLocaleDateString("id-ID")}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SickLeavePage() {
  const { user } = useAuthStore();
  const isAdmin  = ADMIN_ROLES.includes(user?.role?.code ?? "");

  const [createOpen,   setCreateOpen  ] = useState(false);
  const [reviewing,    setReviewing   ] = useState<SickLeave | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lightboxUrl,  setLightboxUrl ] = useState<string | null>(null);

  const myQuery  = useMySickLeaves({ status: (statusFilter as SickLeave["status"]) || undefined });
  const allQuery = useSickLeaves({ status: (statusFilter as SickLeave["status"]) || undefined });
  const query    = isAdmin ? allQuery : myQuery;
  const items    = query.data?.data ?? [];

  const pending    = items.filter((s) => s.status === "PENDING").length;
  const cancelMut  = useCancelSickLeave();

  // No-letter count for current year (employee's own data)
  const currentYear  = new Date().getFullYear();
  const myAllQuery   = useMySickLeaves({});
  const noLetterCount = (myAllQuery.data?.data ?? []).filter((sl) => {
    if (sl.hasLetter) return false;
    if (!["APPROVED", "PENDING"].includes(sl.status)) return false;
    return new Date(sl.startDate).getFullYear() === currentYear;
  }).length;

  async function handleCancel(id: string) {
    try { await cancelMut.mutateAsync(id); } catch { /* errors surfaced globally */ }
  }

  return (
    <PageContainer
      className="max-w-3xl"
      title="Pengajuan Sakit"
      subtitle={isAdmin ? "Kelola pengajuan sakit karyawan" : "Ajukan dan pantau izin sakit kamu"}
      action={
        !isAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajukan Sakit
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">

        {/* Pending warning (admin) */}
        {isAdmin && pending > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{pending}</strong> pengajuan sakit menunggu persetujuan</span>
          </div>
        )}

        {/* No-letter warning (employee) */}
        {!isAdmin && noLetterCount >= 1 && (
          <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm border ${
            noLetterCount >= 2
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {noLetterCount >= 2
                ? "Kamu sudah 2x sakit tanpa surat tahun ini. Pengajuan berikutnya wajib menyertakan surat keterangan dokter."
                : `Kamu sudah ${noLetterCount}x sakit tanpa surat tahun ini. Maksimal 2x per tahun.`}
            </span>
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
            icon={<Thermometer className="w-6 h-6" />}
            title="Belum ada pengajuan sakit"
            description={
              statusFilter
                ? "Tidak ada pengajuan dengan status ini"
                : isAdmin
                  ? "Belum ada pengajuan sakit dari karyawan"
                  : 'Tekan "Ajukan Sakit" untuk mulai'
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((sl) => (
              <SickLeaveCard
                key={sl.id}
                sl={sl}
                isAdmin={isAdmin}
                onReview={setReviewing}
                onCancel={handleCancel}
                onViewPhoto={setLightboxUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} noLetterCount={noLetterCount} />
      {reviewing   && <ReviewDialog sl={reviewing} onClose={() => setReviewing(null)} onViewPhoto={setLightboxUrl} />}
      {lightboxUrl && <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </PageContainer>
  );
}
