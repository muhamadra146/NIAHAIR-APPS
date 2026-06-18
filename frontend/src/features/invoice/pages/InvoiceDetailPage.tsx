import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, Wallet, Trash2 } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import {
  useInvoice,
  useAddPayment,
  useApplyDeposit,
  useCustomerAvailableDeposits,
  useDeleteInvoice,
} from "../hooks";
import type { InvoiceStatus } from "../types";
import { useAppointment } from "@/features/appointment/hooks";
import { fetchCommissions } from "@/features/commission/api";
import { TreatmentAssignmentSection } from "../components/TreatmentAssignmentSection";

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

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError } = useInvoice(id!);
  const paymentMutation = useAddPayment(id!);
  const depositMutation = useApplyDeposit(id!);
  const deleteMutation  = useDeleteInvoice(id!);

  const [payOpen, setPayOpen]     = useState(false);
  const [depOpen, setDepOpen]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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
            <div className="flex shrink-0 gap-2">
              {canPay && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setDepOpen(true)}>
                    <Wallet className="mr-1.5 h-3.5 w-3.5" />
                    Deposit
                  </Button>
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    Bayar
                  </Button>
                </>
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
                  <div>
                    <p className="font-medium">{p.paymentMethod?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.paymentDate)}
                      {p.referenceNo && ` · Ref: ${p.referenceNo}`}
                    </p>
                  </div>
                  <span className="font-semibold text-green-700">{formatCurrency(p.amount)}</span>
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
        }}
        isPending={paymentMutation.isPending}
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
