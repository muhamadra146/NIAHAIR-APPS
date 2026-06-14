import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CreditCard, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDeposit, useDepositPayments, useUpdateDeposit, useDeleteDepositPayment, useResyncDeposit, useResyncDepositPayment } from "../hooks";
import type { DepositPayment } from "../types";

const CAN_EDIT: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

const STATUS_LABEL: Record<string, string> = {
  UNPAID:       "Belum Dibayar",
  PAID:         "Aktif",
  PARTIAL_USED: "Sebagian Terpakai",
  USED:         "Habis",
};

const STATUS_COLOR: Record<string, string> = {
  UNPAID:       "text-yellow-600 border-yellow-300",
  PAID:         "text-green-600 border-green-300",
  PARTIAL_USED: "text-blue-600 border-blue-300",
  USED:         "text-muted-foreground",
};

export function DepositDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuthStore();
  const { data: deposit, isLoading, isError } = useDeposit(id!);
  const { data: payments = [] }               = useDepositPayments(id!);
  const [editOpen, setEditOpen]               = useState(false);

  const canEdit   = user ? CAN_EDIT.includes(user.roleCode) : false;
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<DepositPayment | null>(null);
  const deletePaymentMutation   = useDeleteDepositPayment();
  const resyncDepositMutation   = useResyncDeposit();
  const resyncPaymentMutation   = useResyncDepositPayment();

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !deposit) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Deposit tidak ditemukan.{" "}
          <Link to="/deposits" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const canPay = deposit.status === "UNPAID" && payments.length === 0;

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link to="/deposits"><ChevronLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Detail Deposit</h1>
              <p className="text-sm text-muted-foreground">{deposit.customer?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={resyncDepositMutation.isPending}
                onClick={() => resyncDepositMutation.mutate(id!)}
                title="Sinkronkan ulang ke Accurate"
                className="px-2.5"
              >
                <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${resyncDepositMutation.isPending ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Resync</span>
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="px-2.5">
                <Pencil className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
          </div>
        </div>

        {/* Deposit info */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Info Deposit</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            <Row label="Customer"   value={deposit.customer?.name ?? "—"} />
            <Row label="No. Telepon" value={deposit.customer?.mobilePhone ?? "—"} />
            <Row label="Tanggal"    value={formatDate(deposit.createdAt)} />
            <Row label="Status">
              <Badge variant="outline" className={`text-xs ${STATUS_COLOR[deposit.status] ?? ""}`}>
                {STATUS_LABEL[deposit.status] ?? deposit.status}
              </Badge>
            </Row>
            <div className="border-t border-border/50 pt-3 space-y-3">
              <Row label="Jumlah Deposit">
                <span className="font-bold text-base">{formatCurrency(deposit.amount)}</span>
              </Row>
              <Row label="Terpakai">
                <span className={Number(deposit.usedAmount) > 0 ? "font-medium" : "text-muted-foreground"}>
                  {Number(deposit.usedAmount) > 0 ? formatCurrency(deposit.usedAmount) : "—"}
                </span>
              </Row>
              <Row label="Sisa">
                <span className={Number(deposit.remainingAmount) > 0 ? "font-medium text-green-700" : "text-muted-foreground"}>
                  {Number(deposit.remainingAmount) > 0 ? formatCurrency(deposit.remainingAmount) : "—"}
                </span>
              </Row>
            </div>
            <div className="border-t border-border/50 pt-3">
              <Row label="Accurate">
                {deposit.accurateDepositId ? (
                  <span className="text-xs font-medium text-green-700">{deposit.accurateDepositNumber ?? deposit.accurateDepositId}</span>
                ) : (
                  <span className="text-xs text-yellow-600">Belum sinkron</span>
                )}
              </Row>
            </div>
            {deposit.notes && (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground mb-1">Catatan</p>
                <p className="text-sm">{deposit.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-4">
                {payments.map((p) => (
                  <div key={p.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{p.paymentMethod?.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.paidAt)} · {p.paymentNo}
                          </p>
                          {p.referenceNo && (
                            <p className="text-xs text-muted-foreground">Ref: {p.referenceNo}</p>
                          )}
                          {p.notes && (
                            <p className="text-xs text-muted-foreground">{p.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-700">{formatCurrency(p.amount)}</p>
                          {p.accurateReceiptId ? (
                            <p className="text-xs text-green-600">Accurate ✓</p>
                          ) : (
                            <p className="text-xs text-yellow-600">Belum sinkron</p>
                          )}
                        </div>
                        {canEdit && !p.accurateReceiptId && (
                          <button
                            type="button"
                            disabled={resyncPaymentMutation.isPending}
                            onClick={() => resyncPaymentMutation.mutate(p.id)}
                            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
                            title="Sinkronkan ulang ke Accurate"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${resyncPaymentMutation.isPending ? "animate-spin" : ""}`} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setDeletePaymentTarget(p)}
                            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Hapus pembayaran"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transfer proof photo */}
                    {p.transferProofUrl && (
                      <div className="ml-6">
                        <p className="text-xs text-muted-foreground mb-1.5">Bukti Transfer</p>
                        <a href={p.transferProofUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.transferProofUrl}
                            alt="Bukti transfer"
                            className="max-h-48 w-full rounded-md border border-border object-contain bg-muted/30 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA — bayar jika masih UNPAID */}
        {canPay && (
          <Button className="w-full h-11" onClick={() => navigate(`/deposits/${id}/pay`)}>
            Catat Pembayaran
          </Button>
        )}
      </div>
      {/* Konfirmasi hapus pembayaran */}
      <Dialog open={!!deletePaymentTarget} onOpenChange={(v) => { if (!v) setDeletePaymentTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pembayaran Deposit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus pembayaran{" "}
            <span className="font-medium text-foreground">{deletePaymentTarget?.paymentNo}</span>?
            Deposit akan dikembalikan ke status{" "}
            <span className="font-medium text-foreground">Belum Dibayar</span>.
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletePaymentTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deletePaymentMutation.isPending}
              onClick={async () => {
                if (!deletePaymentTarget) return;
                await deletePaymentMutation.mutateAsync(deletePaymentTarget.id);
                setDeletePaymentTarget(null);
              }}
            >
              {deletePaymentMutation.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <EditDepositDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          deposit={deposit}
          depositId={id!}
        />
      )}
    </PageContainer>
  );
}

function EditDepositDialog({
  open, onOpenChange, deposit, depositId,
}: {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  deposit:        import("../types").Deposit;
  depositId:      string;
}) {
  const updateMutation = useUpdateDeposit(depositId);
  const isUnpaid       = (deposit.status as string) === "UNPAID";
  const canEditAmount  = isUnpaid;

  const [notes,  setNotes]  = useState(deposit.notes ?? "");
  const [amount, setAmount] = useState(deposit.amount ? String(Math.round(Number(deposit.amount))) : "");
  const [error,  setError]  = useState<string | null>(null);

  function handleOpen(v: boolean) {
    if (v) {
      setNotes(deposit.notes ?? "");
      setAmount(deposit.amount ? String(Math.round(Number(deposit.amount))) : "");
      setError(null);
    }
    onOpenChange(v);
  }

  function formatDisplay(raw: string) {
    const n = raw.replace(/\D/g, "");
    return n ? Number(n).toLocaleString("id-ID") : "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: import("../types").UpdateDepositInput = {};
    payload.notes = notes.trim() || null;
    if (canEditAmount) {
      const amt = parseFloat(amount.replace(/\D/g, ""));
      if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
      payload.amount = amt;
    }
    try {
      await updateMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit Deposit</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {canEditAmount && (
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  className="pl-8"
                  value={formatDisplay(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {children ?? <span className="text-sm font-medium text-right">{value}</span>}
    </div>
  );
}
