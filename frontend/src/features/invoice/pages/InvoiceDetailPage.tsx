import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, Wallet, Trash2, Printer, MessageCircle, CheckCircle2, Pencil } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useInvoice,
  useAddPayment,
  useApplyDeposit,
  useCustomerAvailableDeposits,
  useDeleteInvoice,
  useDeletePayment,
} from "../hooks";
import { createDeposit, createDepositPayment, applyDeposit } from "../api";
import type { InvoiceStatus } from "../types";
import { useAppointment } from "@/features/appointment/hooks";
import { fetchCommissions } from "@/features/commission/api";
import { TreatmentAssignmentSection } from "../components/TreatmentAssignmentSection";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID:    "Belum Bayar",
  PAID:      "Lunas",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  UNPAID:    "text-red-600 border-red-300",
  PAID:      "bg-green-600 text-white",
  CANCELLED: "",
};

const CAN_DELETE_PAYMENT: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: invoice, isLoading, isError } = useInvoice(id!);
  const paymentMutation       = useAddPayment(id!);
  const depositMutation       = useApplyDeposit(id!);
  const deleteMutation        = useDeleteInvoice(id!);
  const deletePaymentMutation = useDeletePayment(id!);

  const [payOpen, setPayOpen]                     = useState(false);
  const [depOpen, setDepOpen]                     = useState(false);
  const [newDepOpen, setNewDepOpen]               = useState(false);
  const [editOpen, setEditOpen]                   = useState(false);
  const [deleteConfirm, setDeleteConfirm]         = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen]             = useState(false);
  const qc = useQueryClient();

  const canDeletePayment = user ? CAN_DELETE_PAYMENT.includes(user.roleCode) : false;

  const appointmentId = invoice?.appointmentId ?? null;
  const { data: appointment } = useAppointment(appointmentId ?? "");

  const { data: commissionsData } = useQuery({
    queryKey:  ["commissions", "invoice", id],
    queryFn:   () => fetchCommissions({ invoiceId: id!, limit: 1 }),
    enabled:   !!id,
    staleTime: 0,
  });
  const hasExistingCommission = (commissionsData?.meta?.total ?? 0) > 0;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !invoice) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Invoice tidak ditemukan.{" "}
          <Link to="/invoices" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const canPay    = invoice.status === "UNPAID";
  const outstanding = Number(invoice.outstandingAmount);

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/invoices"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{invoice.invoiceNo}</p>
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {invoice.customer?.name ?? "—"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-xs ${STATUS_COLOR[invoice.status]}`}>
                  {STATUS_LABEL[invoice.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">{formatDate(invoice.invoiceDate)}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {invoice.status === "UNPAID" && (
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {canPay && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setDepOpen(true)}>
                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                    Deposit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setNewDepOpen(true)}>
                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                    Deposit Baru
                  </Button>
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    Bayar
                  </Button>
                </>
              )}
              {invoice.status === "PAID" && (
                <Button size="sm" variant="outline" onClick={() => setReceiptOpen(true)}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Struk
                </Button>
              )}
              {invoice.status !== "PAID" && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Hapus
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Subtotal"    value={formatCurrency(invoice.subtotal)} />
          <SummaryCard label="Diskon"      value={formatCurrency(invoice.totalDiscount)} />
          <SummaryCard label="Pajak"       value={formatCurrency(invoice.totalTax)} />
          <SummaryCard label="Grand Total" value={formatCurrency(invoice.grandTotal)} highlight />
        </div>

        {outstanding > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-red-700">Sisa Pembayaran</span>
            <span className="text-lg font-bold text-red-700">{formatCurrency(invoice.outstandingAmount)}</span>
          </div>
        )}

        {/* Line items */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Item</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Harga</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Diskon</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-2">
                        <p className="font-medium">{item.item?.name ?? item.itemId}</p>
                        <p className="text-xs text-muted-foreground">{item.item?.itemCode} · {item.unit?.name}</p>
                        {item.taxable && <span className="text-xs text-blue-600">+PPN {item.taxRate}%</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{item.qty}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {Number(item.discount) > 0 ? formatCurrency(item.discount) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Deposits applied */}
        {(invoice.invoiceDeposits ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Deposit Diterapkan</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 space-y-1">
              {invoice.invoiceDeposits!.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm px-1">
                  <span className="text-muted-foreground font-mono text-xs">{d.depositId}</span>
                  <span className="font-medium text-green-700">- {formatCurrency(d.amountApplied)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        {(invoice.payments ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Riwayat Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3 space-y-2">
              {invoice.payments!.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded bg-muted/40 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.paymentMethod?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paymentNo && <span className="font-mono">{p.paymentNo} · </span>}
                      {formatDate(p.paymentDate)}
                      {p.referenceNo && ` · Ref: ${p.referenceNo}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                    {canDeletePayment && (
                      <button
                        type="button"
                        onClick={() => setDeletePaymentTarget(p.id)}
                        className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Hapus pembayaran"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Treatment assignment & commission */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Assignment Pekerjaan</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <TreatmentAssignmentSection
              invoiceId={id!}
              appointment={appointmentId ? (appointment ?? null) : null}
              hasExistingCommission={hasExistingCommission}
            />
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        maxAmount={outstanding}
        onSubmit={async (input) => {
          await paymentMutation.mutateAsync(input);
          setPayOpen(false);
          setReceiptOpen(true);
        }}
        isPending={paymentMutation.isPending}
      />

      {/* Create & Apply New Deposit Dialog */}
      <CreateAndApplyDepositDialog
        open={newDepOpen}
        onOpenChange={setNewDepOpen}
        customerId={invoice.customerId}
        invoiceId={id!}
        maxAmount={outstanding}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["invoices"] });
          qc.invalidateQueries({ queryKey: ["deposits"] });
          setNewDepOpen(false);
          setReceiptOpen(true);
        }}
      />

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        invoice={invoice}
      />

      {/* Apply Deposit Dialog */}
      <ApplyDepositDialog
        open={depOpen}
        onOpenChange={setDepOpen}
        customerId={invoice.customerId}
        maxAmount={outstanding}
        onSubmit={async (depositId, amount) => {
          await depositMutation.mutateAsync({ depositId, amount });
          setDepOpen(false);
        }}
        isPending={depositMutation.isPending}
      />

      {/* Delete payment confirm */}
      <Dialog open={!!deletePaymentTarget} onOpenChange={(v) => { if (!v) setDeletePaymentTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Pembayaran?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Pembayaran ini akan dihapus dan sisa tagihan invoice akan disesuaikan. Tindakan ini tidak dapat dibalik.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaymentTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deletePaymentMutation.isPending}
              onClick={async () => {
                if (!deletePaymentTarget) return;
                await deletePaymentMutation.mutateAsync(deletePaymentTarget);
                setDeletePaymentTarget(null);
              }}
            >
              {deletePaymentMutation.isPending ? "Menghapus…" : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus Invoice?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Invoice <span className="font-mono font-medium">{invoice?.invoiceNo}</span> akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibalik.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                await deleteMutation.mutateAsync();
                setDeleteConfirm(false);
                navigate("/invoices");
              }}
            >
              {deleteMutation.isPending ? "Menghapus…" : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit invoice dialog */}
      <CreateInvoiceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        branchId={invoice?.branchId ?? ""}
        initialExistingInvoiceId={id}
        startInEditMode
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["invoices", id] });
          setEditOpen(false);
        }}
      />

    </PageContainer>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-0.5 text-base font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Create & Apply New Deposit Dialog ────────────────────────────────────────

function CreateAndApplyDepositDialog({
  open, onOpenChange, customerId, invoiceId, maxAmount, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  invoiceId: string;
  maxAmount: number;
  onSuccess: () => void;
}) {
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  const [methodId, setMethodId] = useState("");
  const [amount, setAmount]     = useState(String(maxAmount));
  const [refNo, setRefNo]       = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function formatAmountDisplay(raw: string) {
    const num = raw.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  }
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAmount(e.target.value.replace(/\D/g, ""));
  }

  function reset() { setMethodId(""); setAmount(String(maxAmount)); setRefNo(""); setNotes(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId) { setError("Pilih metode pembayaran"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
    setLoading(true);
    setError(null);
    try {
      // Step 1: buat deposit
      const deposit = await createDeposit({ customerId, amount: amt, notes: notes || undefined });
      // Step 2: bayar deposit → status jadi PAID
      await createDepositPayment(deposit.id, {
        paymentMethodId: methodId,
        referenceNo: refNo || undefined,
        notes: notes || undefined,
      });
      // Step 3: terapkan deposit ke invoice
      await applyDeposit(invoiceId, { depositId: deposit.id, amount: amt });
      reset();
      onSuccess();
    } catch (err: unknown) {
      const apiMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(apiMsg ?? (err instanceof Error ? err.message : "Gagal memproses deposit"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bayar dengan Deposit Baru</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          Buat deposit baru, bayar sekarang, dan langsung terapkan ke invoice ini.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Metode Pembayaran *</Label>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Pilih metode</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jumlah * <span className="text-muted-foreground text-xs">(maks. {formatCurrency(maxAmount)})</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input className="pl-8" value={formatAmountDisplay(amount)} onChange={handleAmountChange} placeholder="0" inputMode="numeric" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>No. Referensi</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Opsional" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Memproses…" : "Bayar & Terapkan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Receipt dialog ────────────────────────────────────────────────────────────

function buildWhatsAppMessage(invoice: import("../types").Invoice): string {
  const lines: string[] = [];
  lines.push(`*NIAHAIR - Struk Pembayaran*`);
  lines.push(`No: ${invoice.invoiceNo}`);
  lines.push(`Tanggal: ${new Date(invoice.invoiceDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`);
  lines.push(`Cabang: ${invoice.branch?.name ?? "-"}`);
  lines.push(``);
  lines.push(`*Item:*`);
  (invoice.items ?? []).forEach((item) => {
    const subtotal = Number(item.subtotal).toLocaleString("id-ID");
    lines.push(`• ${item.item?.name ?? "-"} x${item.qty} = Rp ${subtotal}`);
  });
  lines.push(``);
  if (Number(invoice.totalDiscount) > 0) {
    lines.push(`Diskon: -Rp ${Number(invoice.totalDiscount).toLocaleString("id-ID")}`);
  }
  if (Number(invoice.totalTax) > 0) {
    lines.push(`Pajak: Rp ${Number(invoice.totalTax).toLocaleString("id-ID")}`);
  }
  lines.push(`*Total: Rp ${Number(invoice.grandTotal).toLocaleString("id-ID")}*`);
  if ((invoice.payments ?? []).length > 0) {
    lines.push(``);
    lines.push(`*Pembayaran:*`);
    invoice.payments!.forEach((p) => {
      lines.push(`• ${p.paymentMethod?.name ?? "-"}: Rp ${Number(p.amount).toLocaleString("id-ID")}`);
    });
  }
  lines.push(``);
  lines.push(`Terima kasih telah mengunjungi NIAHAIR! 🌟`);
  return lines.join("\n");
}

function printReceipt(invoice: import("../types").Invoice) {
  const items = (invoice.items ?? [])
    .map((item) => `
      <tr>
        <td style="padding:4px 0;border-bottom:1px dashed #e5e7eb">${item.item?.name ?? "-"}${item.item?.itemCode ? `<br><small style="color:#6b7280">${item.item.itemCode}</small>` : ""}</td>
        <td style="padding:4px 0;text-align:center;border-bottom:1px dashed #e5e7eb">${item.qty}</td>
        <td style="padding:4px 0;text-align:right;border-bottom:1px dashed #e5e7eb">Rp ${Number(item.price).toLocaleString("id-ID")}</td>
        <td style="padding:4px 0;text-align:right;border-bottom:1px dashed #e5e7eb">Rp ${Number(item.subtotal).toLocaleString("id-ID")}</td>
      </tr>`)
    .join("");

  const payments = (invoice.payments ?? [])
    .map((p) => `<tr>
        <td style="padding:2px 0;color:#374151">${p.paymentMethod?.name ?? "-"}</td>
        <td style="padding:2px 0;text-align:right;font-weight:600">Rp ${Number(p.amount).toLocaleString("id-ID")}</td>
      </tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Struk - ${invoice.invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; width: 72mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #999; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { font-size: 13px; font-weight: bold; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:15px;letter-spacing:1px">NIAHAIR</div>
  <div class="center" style="font-size:10px;color:#6b7280">Extensions &amp; Coloring</div>
  <div class="center" style="font-size:10px;margin-top:2px">${invoice.branch?.name ?? ""}</div>
  <div class="divider"></div>
  <div style="font-size:11px">
    <div>No : <strong>${invoice.invoiceNo}</strong></div>
    <div>Tgl: ${new Date(invoice.invoiceDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
    <div>Klien: ${invoice.customer?.name ?? "-"}</div>
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr style="font-size:10px;color:#6b7280">
        <th style="text-align:left;padding-bottom:4px">Item</th>
        <th style="text-align:center;padding-bottom:4px">Qty</th>
        <th style="text-align:right;padding-bottom:4px">Harga</th>
        <th style="text-align:right;padding-bottom:4px">Total</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    ${Number(invoice.totalDiscount) > 0 ? `<tr><td>Diskon</td><td style="text-align:right">-Rp ${Number(invoice.totalDiscount).toLocaleString("id-ID")}</td></tr>` : ""}
    ${Number(invoice.totalTax) > 0 ? `<tr><td>Pajak</td><td style="text-align:right">Rp ${Number(invoice.totalTax).toLocaleString("id-ID")}</td></tr>` : ""}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${Number(invoice.grandTotal).toLocaleString("id-ID")}</td></tr>
  </table>
  ${payments ? `<div class="divider"></div><table>${payments}</table>` : ""}
  <div class="divider"></div>
  <div class="center" style="font-size:10px;margin-top:4px">Terima kasih atas kunjungan Anda!</div>
  <div class="center" style="font-size:10px">niahair.id</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

function ReceiptDialog({
  open, onOpenChange, invoice,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: import("../types").Invoice;
}) {
  const phone = invoice.customer?.mobilePhone;
  const waPhone = phone?.replace(/\D/g, "").replace(/^0/, "62");

  function handleWhatsApp() {
    const text = encodeURIComponent(buildWhatsAppMessage(invoice));
    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Pembayaran Berhasil
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Invoice <span className="font-mono font-medium text-foreground">{invoice.invoiceNo}</span> telah lunas.
          </p>
          <p className="text-sm font-semibold">
            Total: {formatCurrency(invoice.grandTotal)}
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={() => printReceipt(invoice)} className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Cetak Struk PDF
          </Button>
          {waPhone ? (
            <Button variant="outline" onClick={handleWhatsApp} className="w-full text-green-700 border-green-300 hover:bg-green-50">
              <MessageCircle className="mr-2 h-4 w-4" />
              Kirim ke WhatsApp
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Nomor WhatsApp tidak tersedia untuk customer ini
            </p>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add payment dialog ────────────────────────────────────────────────────────

function AddPaymentDialog({
  open, onOpenChange, maxAmount, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maxAmount: number;
  onSubmit: (input: import("../types").AddPaymentInput) => Promise<void>;
  isPending: boolean;
}) {
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  const [methodId, setMethodId] = useState("");
  const [amount, setAmount]     = useState(String(maxAmount));
  const [refNo, setRefNo]       = useState("");
  const [notes, setNotes]       = useState("");
  const [error, setError]       = useState<string | null>(null);

  function formatAmountDisplay(raw: string) {
    const num = raw.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  }
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(raw);
  }

  function reset() { setMethodId(""); setAmount(String(maxAmount)); setRefNo(""); setNotes(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId) { setError("Pilih metode pembayaran"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
    setError(null);
    try {
      await onSubmit({ paymentMethodId: methodId, amount: amt, referenceNo: refNo || undefined, notes: notes || undefined });
      reset();
    } catch (err: unknown) {
      const apiMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(apiMsg ?? (err instanceof Error ? err.message : "Gagal mencatat pembayaran"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Metode Pembayaran *</Label>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Pilih metode</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jumlah * <span className="text-muted-foreground text-xs">(maks. {formatCurrency(maxAmount)})</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input className="pl-8" value={formatAmountDisplay(amount)} onChange={handleAmountChange} placeholder="0" inputMode="numeric" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>No. Referensi</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Opsional" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Apply deposit dialog ──────────────────────────────────────────────────────

function ApplyDepositDialog({
  open, onOpenChange, customerId, maxAmount, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  maxAmount: number;
  onSubmit: (depositId: string, amount: number) => Promise<void>;
  isPending: boolean;
}) {
  const { data: deposits = [] } = useCustomerAvailableDeposits(customerId);
  const [depositId, setDepositId] = useState("");
  const [amount, setAmount]       = useState("");
  const [error, setError]         = useState<string | null>(null);

  const selected = deposits.find((d) => d.id === depositId);

  function reset() { setDepositId(""); setAmount(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositId) { setError("Pilih deposit"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
    setError(null);
    try { await onSubmit(depositId, amt); reset(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal menerapkan deposit"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Terapkan Deposit</DialogTitle></DialogHeader>
        {deposits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Tidak ada deposit tersedia untuk customer ini.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Pilih Deposit *</Label>
              <select value={depositId} onChange={(e) => { setDepositId(e.target.value); setAmount(""); }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Pilih deposit</option>
                {deposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {formatCurrency(d.remainingAmount)} tersisa — {formatDate(d.createdAt)}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-muted-foreground">
                  Sisa: {formatCurrency(selected.remainingAmount)}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={selected ? Math.min(Number(selected.remainingAmount), maxAmount) : maxAmount}
                value={amount}
                placeholder={selected ? `Maks. ${formatCurrency(Math.min(Number(selected.remainingAmount), maxAmount))}` : ""}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Menerapkan…" : "Terapkan"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
