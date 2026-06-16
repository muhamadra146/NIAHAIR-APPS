import { useState, useRef } from "react";
import { Plus, CheckCircle, XCircle, X, Thermometer, AlertTriangle, Paperclip, FileImage, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import {
  useMySickLeaves, useSickLeaves,
  useCreateSickLeave, useApproveSickLeave, useRejectSickLeave, useCancelSickLeave,
  useUploadSickLeaveDocument,
} from "../hooks";
import type { SickLeave } from "../types";

const isManager = (role?: string) =>
  ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"].includes(role ?? "");

function statusBadge(status: SickLeave["status"]) {
  if (status === "APPROVED") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">Disetujui</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">Ditolak</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">Menunggu</Badge>;
}

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

// ── Review dialog ─────────────────────────────────────────────────────
function ReviewDialog({ sl, onClose }: { sl: SickLeave; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [err,  setErr ] = useState<string | null>(null);
  const approveMut = useApproveSickLeave();
  const rejectMut  = useRejectSickLeave();
  const pending = approveMut.isPending || rejectMut.isPending;

  async function handle(action: "approve" | "reject") {
    setErr(null);
    try {
      if (action === "approve") await approveMut.mutateAsync({ id: sl.id, input: { reviewNote: note || undefined } });
      else                       await rejectMut.mutateAsync({ id: sl.id, input: { reviewNote: note || undefined } });
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-sm">Review Sakit</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{sl.employee.name}</p>
            <p className="text-muted-foreground">
              {fmtDate(sl.startDate)} – {fmtDate(sl.endDate)} ({sl.totalDays} hari)
            </p>
            <p className="text-muted-foreground">
              Surat dokter: <span className={sl.hasLetter ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {sl.hasLetter ? "Ada" : "Tidak ada"}
              </span>
            </p>
            {sl.doctorName  && <p className="text-muted-foreground">Dokter: {sl.doctorName}</p>}
            {sl.diagnosis   && <p className="text-muted-foreground">Diagnosa: {sl.diagnosis}</p>}
            {sl.clinicName  && <p className="text-muted-foreground">Klinik: {sl.clinicName}</p>}
            {sl.letterPhotoUrl && (
              <a href={sl.letterPhotoUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <FileImage className="h-3.5 w-3.5" /> Lihat Foto Dokumen
              </a>
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
        <div className="flex gap-2 border-t px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="flex-1">Batal</Button>
          <Button variant="destructive" size="sm" onClick={() => handle("reject")} disabled={pending} className="flex-1">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak
          </Button>
          <Button size="sm" onClick={() => handle("approve")} disabled={pending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Setujui
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────
function CreateForm({ onClose, noLetterCount }: { onClose: () => void; noLetterCount: number }) {
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

  const createMut   = useCreateSickLeave();
  const uploadMut   = useUploadSickLeaveDocument();
  const isPending   = createMut.isPending || uploadMut.isPending;

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
      // Upload document if selected
      if (docFile) {
        await uploadMut.mutateAsync({ id: sl.id, file: docFile });
      }
      onClose();
    } catch (e) { setErr(apiErr(e)); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-sm">Ajukan Sakit</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {!hasLetter && noLetterCount >= 1 && (
            <div className={`rounded-lg px-3 py-2.5 text-xs flex gap-2 ${noLetterCount >= 2 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {noLetterCount >= 2
                  ? "Kamu sudah mencapai batas 2x sakit tanpa surat tahun ini. Pengajuan tanpa surat tidak dapat diterima."
                  : `Kamu sudah 1x sakit tanpa surat tahun ini. Maksimal 2x per tahun.`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Mulai <span className="text-destructive">*</span></Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal Selesai <span className="text-destructive">*</span></Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Has letter toggle */}
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
                <button type="button" onClick={() => { setDocFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-muted-foreground hover:text-destructive">
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
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
              {isPending ? "Mengajukan..." : "Ajukan Sakit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export function SickLeavePage() {
  const { user } = useAuthStore();
  const role     = user?.role?.code ?? "";
  const manager  = isManager(role);

  const [createOpen,   setCreateOpen  ] = useState(false);
  const [reviewing,    setReviewing   ] = useState<SickLeave | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const myQuery  = useMySickLeaves({ status: (statusFilter as SickLeave["status"]) || undefined });
  const allQuery = useSickLeaves({ status: (statusFilter as SickLeave["status"]) || undefined });
  const query    = manager ? allQuery : myQuery;
  const items    = query.data?.data ?? [];

  const cancelMut = useCancelSickLeave();

  // Count no-letter sick leaves in current year for the employee (from their own data)
  const currentYear = new Date().getFullYear();
  const myAllQuery = useMySickLeaves({});
  const noLetterCount = (myAllQuery.data?.data ?? []).filter((sl) => {
    if (sl.hasLetter) return false;
    if (!["APPROVED", "PENDING"].includes(sl.status)) return false;
    return new Date(sl.startDate).getFullYear() === currentYear;
  }).length;

  async function handleCancel(id: string) {
    try { await cancelMut.mutateAsync(id); } catch { /* errors surfaced in UI */ }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sakit</h1>
          <p className="text-sm text-muted-foreground">
            {manager ? "Kelola pengajuan sakit karyawan" : "Ajukan dan pantau izin sakit kamu"}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ajukan Sakit
        </Button>
      </div>

      {/* No-letter warning banner for employees */}
      {!manager && noLetterCount >= 1 && (
        <div className={`rounded-lg px-4 py-3 flex gap-2.5 text-sm ${noLetterCount >= 2 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {noLetterCount >= 2
              ? "Kamu sudah 2x sakit tanpa surat tahun ini. Pengajuan berikutnya wajib menyertakan surat keterangan dokter."
              : `Kamu sudah ${noLetterCount}x sakit tanpa surat tahun ini. Maksimal 2x per tahun.`}
          </span>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {s === "" ? "Semua" : s === "PENDING" ? "Menunggu" : s === "APPROVED" ? "Disetujui" : "Ditolak"}
          </button>
        ))}
      </div>

      {/* List */}
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Thermometer className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada pengajuan sakit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((sl) => (
            <div key={sl.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {manager && (
                    <p className="font-semibold text-sm">{sl.employee.name}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">{sl.employee.role?.name}</span>
                    </p>
                  )}
                  <p className={`font-medium text-sm ${manager ? "mt-0.5" : ""}`}>
                    {fmtDate(sl.startDate)} – {fmtDate(sl.endDate)}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">({sl.totalDays} hari)</span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      sl.hasLetter
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-orange-50 text-orange-700"
                    }`}>
                      {sl.hasLetter ? "Ada surat dokter" : "Tanpa surat"}
                    </span>
                  </div>
                  {sl.diagnosis  && <p className="mt-1 text-sm text-muted-foreground">Diagnosa: {sl.diagnosis}</p>}
                  {sl.doctorName && <p className="mt-0.5 text-xs text-muted-foreground">dr. {sl.doctorName}{sl.clinicName ? ` — ${sl.clinicName}` : ""}</p>}
                  {sl.letterPhotoUrl && (
                    <a href={sl.letterPhotoUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors">
                      <FileImage className="h-3 w-3" />
                      Lihat Foto Dokumen
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {sl.reviewNote && (
                    <p className="mt-1 text-xs rounded-md bg-muted/50 px-2 py-1">
                      Catatan: {sl.reviewNote}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {statusBadge(sl.status)}
                  {sl.status === "PENDING" && manager && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setReviewing(sl)}>
                      Review
                    </Button>
                  )}
                  {sl.status === "PENDING" && !manager && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleCancel(sl.id)}
                      disabled={cancelMut.isPending}>
                      Batalkan
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cabang: {sl.branch.name} · Diajukan {new Date(sl.createdAt).toLocaleDateString("id-ID")}
              </p>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateForm onClose={() => setCreateOpen(false)} noLetterCount={noLetterCount} />}
      {reviewing  && <ReviewDialog sl={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}
