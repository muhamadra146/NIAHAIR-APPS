import { useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Upload, X, ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { useDeposit, useCreateDepositPayment, useDepositPayments } from "../hooks";

export function DepositPaymentPage() {
  const { id }             = useParams<{ id: string }>();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const defaultDate        = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const { data: deposit, isLoading, isError } = useDeposit(id!);
  const { data: existingPayments = [] }        = useDepositPayments(id!);
  const createMutation                         = useCreateDepositPayment(id!);

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  const [methodId, setMethodId]           = useState("");
  const [paidAt, setPaidAt]               = useState(defaultDate);
  const [refNo, setRefNo]                 = useState("");
  const [notes, setNotes]                 = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file) {
      setTransferProof(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setTransferProof(null);
      setPreviewUrl(null);
    }
  }

  function removeFile() {
    setTransferProof(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    if (fileInput.current) fileInput.current.value = "";
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
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

  const alreadyPaid = deposit.status !== "UNPAID" || existingPayments.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId) { setError("Pilih metode pembayaran"); return; }
    setError(null);
    try {
      await createMutation.mutateAsync({
        paymentMethodId: methodId,
        paidAt:          paidAt ? new Date(paidAt).toISOString() : undefined,
        referenceNo:     refNo          || undefined,
        notes:           notes          || undefined,
        transferProof:   transferProof  ?? undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    }
  }

  // ── Success state ────────────────────────────────────────────────────
  if (success) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-xl font-bold">Pembayaran Deposit Berhasil!</h2>
          <p className="text-sm text-muted-foreground text-center">
            Pembayaran untuk deposit <span className="font-medium">{deposit.customer?.name}</span> sebesar{" "}
            <span className="font-medium">{formatCurrency(deposit.amount)}</span> telah dicatat.
          </p>
          <p className="text-xs text-muted-foreground">Sedang disinkronkan ke Accurate...</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/deposits")}>
              Kembali ke Daftar Deposit
            </Button>
            <Button onClick={() => navigate(`/customers/${deposit.customerId}`)}>
              Lihat Customer
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/deposits"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Catat Pembayaran Deposit</h1>
            <p className="text-sm text-muted-foreground">Rekam pembayaran untuk deposit berikut</p>
          </div>
        </div>

        {/* Deposit summary */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Info Deposit</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">{deposit.customer?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jumlah Deposit</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(deposit.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tanggal Buat</span>
              <span className="text-sm">{formatDate(deposit.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                {deposit.status}
              </Badge>
            </div>
            {deposit.notes && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground">Catatan</span>
                <span className="text-sm text-right">{deposit.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Already paid */}
        {alreadyPaid ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-700">Deposit ini sudah dibayar</p>
              {existingPayments[0] && (
                <p className="text-xs text-green-600">
                  {existingPayments[0].paymentMethod?.name} ·{" "}
                  {formatDate(existingPayments[0].paidAt)} ·{" "}
                  {formatCurrency(existingPayments[0].amount)}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/deposits")}>
                Kembali
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Payment form */
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Detail Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Payment method */}
                <div className="flex flex-col gap-1.5">
                  <Label>Metode Pembayaran *</Label>
                  <select
                    value={methodId}
                    onChange={(e) => setMethodId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Pilih metode pembayaran</option>
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <Label>Tanggal Pembayaran *</Label>
                  <Input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    required
                  />
                </div>

                {/* Reference */}
                <div className="flex flex-col gap-1.5">
                  <Label>No. Referensi</Label>
                  <Input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="No. transfer / kwitansi (opsional)"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <Label>Catatan</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Bukti Transfer */}
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Bukti Transfer
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(opsional)</span>
                  </Label>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {!transferProof ? (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="flex items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
                    >
                      <Upload className="h-4 w-4 shrink-0" />
                      <span>Klik untuk upload foto bukti transfer</span>
                    </button>
                  ) : (
                    <div className="relative overflow-hidden rounded-md border border-input bg-muted/30">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Bukti transfer" className="max-h-48 w-full object-contain" />
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-3">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate text-sm">{transferProof.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground shadow hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                {/* Total to pay */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm font-medium">Total Dibayar</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(deposit.amount)}</span>
                </div>

                <Button type="submit" className="w-full h-11" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Memproses…
                    </span>
                  ) : (
                    "Konfirmasi Pembayaran"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
