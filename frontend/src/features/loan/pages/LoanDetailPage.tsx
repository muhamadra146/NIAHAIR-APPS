import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLoan, useAddRepayment, useCancelLoan } from "../hooks";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Aktif",
  PAID_OFF:  "Lunas",
  CANCELLED: "Dibatalkan",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    "text-blue-600 border-blue-300",
  PAID_OFF:  "text-green-600 border-green-300",
  CANCELLED: "text-muted-foreground",
};

export function LoanDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const { data: loan, isLoading, isError } = useLoan(id!);
  const addRepaymentMutation = useAddRepayment(id!);
  const cancelMutation       = useCancelLoan(id!);

  const [repayOpen, setRepayOpen]     = useState(false);
  const [cancelOpen, setCancelOpen]   = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !loan) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Kasbon tidak ditemukan.{" "}
          <Link to="/loans" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const pct = Number(loan.totalAmount) > 0
    ? Math.round(((Number(loan.totalAmount) - Number(loan.remainingAmount)) / Number(loan.totalAmount)) * 100)
    : 0;
  const isActive = loan.status === "ACTIVE";

  return (
    <PageContainer>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/loans"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{loan.loanNo}</h1>
              <Badge variant="outline" className={`text-xs ${STATUS_COLOR[loan.status] ?? ""}`}>
                {STATUS_LABEL[loan.status] ?? loan.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{loan.employee?.name ?? "—"}</p>
          </div>
          {isActive && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setRepayOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Angsur
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}>
                Batalkan
              </Button>
            </div>
          )}
        </div>

        {/* Info card */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Informasi Kasbon</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Karyawan" value={loan.employee?.name ?? "—"} />
              <InfoRow label="Cabang" value={loan.branch?.name ?? "—"} />
              <InfoRow label="Total Kasbon" value={formatCurrency(loan.totalAmount)} />
              <InfoRow label="Sisa" value={
                <span className={Number(loan.remainingAmount) > 0 ? "font-semibold text-orange-600" : "font-semibold text-green-600"}>
                  {Number(loan.remainingAmount) > 0 ? formatCurrency(loan.remainingAmount) : "Lunas"}
                </span>
              } />
              <InfoRow label="Cicilan/Bulan" value={formatCurrency(loan.monthlyDeduction)} />
              <InfoRow label="Tanggal Mulai" value={formatDate(loan.startDate)} />
              {loan.endDate && <InfoRow label="Tanggal Selesai" value={formatDate(loan.endDate)} />}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progress pelunasan</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Dibayar: {formatCurrency(Number(loan.totalAmount) - Number(loan.remainingAmount))}</span>
                <span>Sisa: {formatCurrency(loan.remainingAmount)}</span>
              </div>
            </div>

            {loan.notes && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {loan.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repayments */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Riwayat Angsuran ({loan.repayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loan.repayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada angsuran.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Tanggal</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/70 uppercase tracking-wide">Jumlah</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Sumber</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.repayments.map((r) => (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.paidAt)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-700">{formatCurrency(r.amount)}</td>
                        <td className="px-4 py-2.5">
                          {r.payrollId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                              Payroll
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add repayment dialog */}
      <AddRepaymentDialog
        open={repayOpen}
        onOpenChange={setRepayOpen}
        maxAmount={Number(loan.remainingAmount)}
        onSubmit={async (input) => {
          await addRepaymentMutation.mutateAsync(input);
          setRepayOpen(false);
        }}
        isPending={addRepaymentMutation.isPending}
      />

      {/* Cancel confirmation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Batalkan Kasbon</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin membatalkan kasbon <span className="font-medium">{loan.loanNo}</span>? Tindakan ini tidak dapat diurungkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Tidak</Button>
            <Button variant="destructive" disabled={cancelMutation.isPending}
              onClick={async () => { await cancelMutation.mutateAsync(); setCancelOpen(false); }}>
              {cancelMutation.isPending ? "Membatalkan…" : "Ya, Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function AddRepaymentDialog({
  open, onOpenChange, maxAmount, onSubmit, isPending,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  maxAmount:    number;
  onSubmit:     (input: import("../types").AddRepaymentInput) => Promise<void>;
  isPending:    boolean;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayStr);
  const [notes, setNotes]   = useState("");
  const [error, setError]   = useState<string | null>(null);

  function reset() { setAmount(""); setPaidAt(todayStr); setNotes(""); setError(null); }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Jumlah harus > 0"); return; }
    if (amt > maxAmount) { setError(`Jumlah tidak boleh melebihi sisa ${formatCurrency(maxAmount)}`); return; }
    setError(null);
    try { await onSubmit({ amount: amt, paidAt, notes: notes || undefined }); reset(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Gagal mencatat angsuran"); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Catat Angsuran</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Jumlah *</Label>
            <Input type="number" min="0.01" step="0.01" max={maxAmount} value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder={`maks. ${formatCurrency(maxAmount)}`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tanggal *</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
