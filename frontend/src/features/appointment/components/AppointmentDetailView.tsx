import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Home, Store, Plus, Loader2, Trash2, Upload, X, ImageIcon, FileText, ExternalLink } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { fetchDeposits, createDeposit, createDepositPayment, fetchInvoices } from "@/features/invoice/api";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { CreateInvoiceDialog } from "@/features/invoice/components/CreateInvoiceDialog";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchAppointmentPhotos,
  uploadAppointmentPhoto,
  deleteAppointmentPhoto,
  type AppointmentPhoto,
  type AppointmentPhotoType,
} from "../api/appointment.api";
import { toast } from "@/lib/toast";
import type { Appointment } from "../types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function DetailsTab({ a }: { a: Appointment }) {
  const startTime = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(a.endTime).toLocaleTimeString("id-ID",   { hour: "2-digit", minute: "2-digit" });
  const isHS      = a.type === "HOME_SERVICE";

  return (
    <div className="space-y-3 py-4">
      <InfoRow label="Booking No"  value={<span className="font-mono text-xs">{a.bookingNo}</span>} />
      <InfoRow label="Tipe"        value={
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isHS ? "text-orange-600" : "text-blue-600"}`}>
          {isHS ? <Home className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
          {isHS ? "Home Service" : "Salon"}
        </span>
      } />
      {isHS && <InfoRow label="Alamat HS" value={a.homeServiceAddress ?? "—"} />}
      <InfoRow label="Customer"        value={`${a.customer.name}${a.customer.customerNo ? ` (${a.customer.customerNo})` : ""}`} />
      <InfoRow label="Branch"          value={`${a.branch.name} (${a.branch.code})`} />
      <InfoRow label="Visit Date"      value={formatDate(a.visitDate)} />
      <InfoRow label="Time"            value={`${startTime} – ${endTime}`} />
<InfoRow label="Notes"           value={a.notes} />
      <InfoRow label="Booked On"       value={formatDate(a.bookingDate)} />
      {a.createdByEmployee && (
        <InfoRow label="Created By" value={`${a.createdByEmployee.name} (${a.createdByEmployee.employeeCode})`} />
      )}
    </div>
  );
}

function ServicesTab({ a }: { a: Appointment }) {
  if (a.services.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No services added.</p>;
  }
  return (
    <div className="divide-y divide-border py-2">
      {a.services.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{s.serviceItem.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{s.serviceItem.itemCode}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffTab({ a }: { a: Appointment }) {
  if (a.staffs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No staff assigned.</p>;
  }
  const isHS = a.type === "HOME_SERVICE";
  return (
    <div className="divide-y divide-border py-2">
      {isHS && (
        <div className="flex items-center gap-2 pb-3 text-xs text-orange-600 font-medium">
          <Home className="h-3.5 w-3.5" />
          Home Service — {a.staffs.length <= 3 ? "Rp 75.000/orang" : "Rp 50.000/orang"} · {a.staffs.length} staff
        </div>
      )}
      {a.staffs.map((s) => (
        <div key={s.id} className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{s.employee.name}</p>
            <p className="text-xs text-muted-foreground">{s.employee.employeeCode}</p>
          </div>
          {s.employee.role && (
            <Badge variant="outline" className="text-xs">{s.employee.role.name}</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ a }: { a: Appointment }) {
  if (a.statusHistories.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No history.</p>;
  }
  return (
    <div className="py-2">
      <ol className="relative border-l border-border ml-3 space-y-4">
        {a.statusHistories.map((h) => (
          <li key={h.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground" />
            <div className="flex flex-wrap items-center gap-2">
              {h.oldStatus
                ? <><AppointmentStatusBadge status={h.oldStatus} /><span className="text-xs text-muted-foreground">→</span></>
                : null}
              <AppointmentStatusBadge status={h.newStatus} />
            </div>
            {h.notes && <p className="mt-1 text-xs text-muted-foreground">{h.notes}</p>}
            <time className="mt-0.5 block text-xs text-muted-foreground">
              {new Date(h.createdAt).toLocaleString("id-ID")}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}

const INVOICE_STATUS_LABEL: Record<string, string> = {
  UNPAID:    "Belum Lunas",
  PAID:      "Lunas",
  CANCELLED: "Dibatalkan",
};
const INVOICE_STATUS_COLOR: Record<string, string> = {
  UNPAID:    "text-red-600 border-red-300",
  PAID:      "text-green-600 border-green-300",
  CANCELLED: "text-muted-foreground",
};

function InvoiceTab({ a }: { a: Appointment }) {
  const { branchId } = useAuthStore();
  const navigate     = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", { appointmentId: a.id }],
    queryFn:  () => fetchInvoices({ appointmentId: a.id, limit: 1 }),
    staleTime: 0,
  });

  const invoice = data?.data?.[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat invoice…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-8 text-center space-y-3">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Invoice belum dibuat untuk booking ini.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Buat Invoice
        </Button>
        <CreateInvoiceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          branchId={branchId ?? ""}
          preselectedAppointment={a}
          onSuccess={(invoiceId) => {
            setCreateOpen(false);
            navigate(`/invoices/${invoiceId}`);
          }}
        />
      </div>
    );
  }

  const items    = invoice.items ?? [];
  const deposits = invoice.invoiceDeposits ?? [];

  return (
    <div className="py-4 space-y-4">
      {/* Invoice header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold font-mono">{invoice.invoiceNo}</p>
          <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${INVOICE_STATUS_COLOR[invoice.status] ?? ""}`}
          >
            {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
          </Badge>
          <Link
            to={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Lihat Invoice
          </Link>
        </div>
      </div>

      {/* Line items */}
      {items.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Harga</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.item?.name ?? "—"}</p>
                    {Number(item.discount) > 0 && (
                      <p className="text-xs text-muted-foreground">Diskon {formatCurrency(item.discount)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{item.qty}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(item.price)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="rounded-md border border-border divide-y divide-border text-sm">
        <div className="flex justify-between px-3 py-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {Number(invoice.totalDiscount) > 0 && (
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">Diskon</span>
            <span className="text-red-600">- {formatCurrency(invoice.totalDiscount)}</span>
          </div>
        )}
        {Number(invoice.totalTax) > 0 && (
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">Pajak</span>
            <span>{formatCurrency(invoice.totalTax)}</span>
          </div>
        )}
        <div className="flex justify-between px-3 py-2 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(invoice.grandTotal)}</span>
        </div>
        {deposits.length > 0 && (
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">DP Dipakai</span>
            <span className="text-green-700">- {formatCurrency(invoice.totalDeposit)}</span>
          </div>
        )}
        {Number(invoice.outstandingAmount) > 0 && (
          <div className="flex justify-between px-3 py-2 font-semibold text-red-600">
            <span>Sisa Tagihan</span>
            <span>{formatCurrency(invoice.outstandingAmount)}</span>
          </div>
        )}
        {invoice.status === "PAID" && (
          <div className="flex justify-between px-3 py-2 font-semibold text-green-600">
            <span>Lunas</span>
            <span>{formatCurrency(invoice.paidAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────

function Lightbox({ photos, initialIndex, onClose }: {
  photos:       AppointmentPhoto[];
  initialIndex: number;
  onClose:      () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const photo = photos[idx];

  function prev() { setIdx((i) => (i - 1 + photos.length) % photos.length); }
  function next() { setIdx((i) => (i + 1) % photos.length); }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 rounded-full bg-white/10 px-3 py-4 text-white text-xl hover:bg-white/20"
          >‹</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-14 rounded-full bg-white/10 px-3 py-4 text-white text-xl hover:bg-white/20"
          >›</button>
        </>
      )}

      <div className="flex flex-col items-center gap-3 px-16" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt=""
          className="max-h-[80dvh] max-w-[90vw] rounded-lg object-contain"
        />
        <div className="text-center">
          <p className="text-xs text-white/60">{idx + 1} / {photos.length}</p>
          {photo.notes && <p className="mt-1 text-sm text-white/80">{photo.notes}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Photo Section ─────────────────────────────────────────────────────

function PhotoSection({
  appointmentId,
  type,
  label,
  photos,
  onUploaded,
  onDeleted,
}: {
  appointmentId: string;
  type:          AppointmentPhotoType;
  label:         string;
  photos:        AppointmentPhoto[];
  onUploaded:    () => void;
  onDeleted:     () => void;
}) {
  const fileRef          = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState<number | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadAppointmentPhoto(appointmentId, file, type);
      }
      onUploaded();
      toast.success("Foto berhasil diupload");
    } catch {
      toast.error("Gagal upload foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await deleteAppointmentPhoto(appointmentId, photoId);
      onDeleted();
      toast.success("Foto dihapus");
    } catch {
      toast.error("Gagal menghapus foto");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="h-8 text-xs"
        >
          {uploading
            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Uploading…</>
            : <><Upload className="mr-1.5 h-3.5 w-3.5" />Upload Foto</>
          }
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <div
          className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="h-6 w-6" />
          <p className="text-xs">Belum ada foto — klik untuk upload</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/20">
              <img
                src={p.url}
                alt=""
                className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                onClick={() => setLightbox(i)}
              />
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </div>
        </div>
      )}

      {lightbox !== null && (
        <Lightbox photos={photos} initialIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ── Photos Tab ────────────────────────────────────────────────────────

function PhotosTab({ a }: { a: Appointment }) {
  const qc = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["appointmentPhotos", a.id],
    queryFn:  () => fetchAppointmentPhotos(a.id),
    staleTime: 0,
  });

  const refPhotos  = photos.filter((p) => p.type === "REFERENCE");
  const hairPhotos = photos.filter((p) => p.type === "HAIR_CURRENT");

  function invalidate() { qc.invalidateQueries({ queryKey: ["appointmentPhotos", a.id] }); }

  return (
    <div className="space-y-6 py-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Memuat foto…</span>
        </div>
      )}
      {!isLoading && (
        <>
          <PhotoSection
            appointmentId={a.id}
            type="REFERENCE"
            label="Foto Referensi (dari customer)"
            photos={refPhotos}
            onUploaded={invalidate}
            onDeleted={invalidate}
          />
          <div className="border-t border-border" />
          <PhotoSection
            appointmentId={a.id}
            type="HAIR_CURRENT"
            label="Foto Rambut Client"
            photos={hairPhotos}
            onUploaded={invalidate}
            onDeleted={invalidate}
          />
        </>
      )}
    </div>
  );
}

// ── Ambil DP Dialog ───────────────────────────────────────────────────

function AmbildDPDialog({
  open,
  onOpenChange,
  appointment,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  appointment:  Appointment;
}) {
  const qc = useQueryClient();
  const [amount, setAmount]   = useState("");
  const [pmId,   setPmId]     = useState("");
  const [notes,  setNotes]    = useState("");
  const [saving, setSaving]   = useState(false);

  const { data: pmData } = useQuery({
    queryKey: ["paymentMethods", { isActive: true }],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
    enabled:  open,
  });
  const paymentMethods = pmData ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      const deposit = await createDeposit({
        customerId:    appointment.customerId,
        appointmentId: appointment.id,
        amount:        Number(amount),
        notes:         notes || undefined,
      });
      if (pmId) {
        await createDepositPayment(deposit.id, { paymentMethodId: pmId });
      }
      qc.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("DP berhasil dicatat");
      onOpenChange(false);
      setAmount(""); setPmId(""); setNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan DP");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ambil DP</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium">{appointment.customer.name}</p>
            <p className="text-xs text-muted-foreground">{appointment.bookingNo}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dp-amount">Jumlah DP (IDR) <span className="text-destructive">*</span></Label>
            <Input
              id="dp-amount"
              type="number"
              min={1}
              step={10000}
              placeholder="Contoh: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dp-pm">Metode Bayar <span className="text-destructive">*</span></Label>
            <select
              id="dp-pm"
              value={pmId}
              onChange={(e) => setPmId(e.target.value)}
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Pilih metode…</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dp-notes">Catatan</Label>
            <Input
              id="dp-notes"
              placeholder="Opsional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving || !amount || !pmId}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan…</> : "Simpan DP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── DP Tab ────────────────────────────────────────────────────────────

function DepositTab({ a }: { a: Appointment }) {
  const [dpOpen, setDpOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deposits", { appointmentId: a.id }],
    queryFn:  () => fetchDeposits({ appointmentId: a.id, limit: 20 }),
  });
  const deposits = data?.data ?? [];
  const totalDP  = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  const STATUS_LABEL: Record<string, string> = {
    PAID:         "Lunas",
    PARTIAL_USED: "Sebagian Dipakai",
    USED:         "Habis",
    REFUNDED:     "Refund",
    CANCELLED:    "Dibatalkan",
  };
  const STATUS_COLOR: Record<string, string> = {
    PAID:         "text-green-600 border-green-300",
    PARTIAL_USED: "text-blue-600 border-blue-300",
    USED:         "text-muted-foreground",
    REFUNDED:     "text-orange-600 border-orange-300",
    CANCELLED:    "text-muted-foreground",
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Deposit / DP</p>
          {deposits.length > 0 && (
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(totalDP)}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setDpOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ambil DP
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}

      {!isLoading && deposits.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Belum ada DP untuk booking ini.</p>
      )}

      {deposits.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {deposits.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{formatCurrency(Number(d.amount))}</p>
                <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                {d.notes && <p className="text-xs text-muted-foreground italic">{d.notes}</p>}
              </div>
              <Badge variant="outline" className={`text-xs ${STATUS_COLOR[d.status] ?? ""}`}>
                {STATUS_LABEL[d.status] ?? d.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <AmbildDPDialog open={dpOpen} onOpenChange={setDpOpen} appointment={a} />
    </div>
  );
}

export function AppointmentDetailView({ appointment }: { appointment: Appointment }) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="photos">Foto</TabsTrigger>
        <TabsTrigger value="staff">
          Staff{appointment.staffs.length > 0 && ` (${appointment.staffs.length})`}
        </TabsTrigger>
        <TabsTrigger value="dp">DP</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="invoice">Invoice</TabsTrigger>
      </TabsList>
      <TabsContent value="details">  <DetailsTab a={appointment} /></TabsContent>
      <TabsContent value="photos">   <PhotosTab a={appointment} /></TabsContent>
      <TabsContent value="staff">    <StaffTab a={appointment} /></TabsContent>
      <TabsContent value="dp">       <DepositTab a={appointment} /></TabsContent>
      <TabsContent value="history">  <HistoryTab a={appointment} /></TabsContent>
      <TabsContent value="invoice">  <InvoiceTab a={appointment} /></TabsContent>
    </Tabs>
  );
}
