import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAllInvoicePayments, useInvoicePaymentSummary, useDeletePayment } from "../hooks";
import type { InvoicePayment } from "../types";

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export function InvoicePaymentListPage() {
  const { branchId, user } = useAuthStore();
  const [page, setPage]              = useState(1);
  const [startDate, setStart]        = useState("");
  const [endDate, setEnd]            = useState("");
  const [paymentMethodId, setMethod] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InvoicePayment | null>(null);

  const deleteMutation = useDeletePayment("");
  const canDelete = user ? CAN_DELETE.includes(user.roleCode) : false;

  const { data: methodsData = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  const { data, isLoading } = useAllInvoicePayments({
    page,
    limit:           20,
    branchId:        branchId        || undefined,
    paymentMethodId: paymentMethodId || undefined,
    startDate:       startDate       || undefined,
    endDate:         endDate         || undefined,
  });

  const { data: summary } = useInvoicePaymentSummary({
    branchId:        branchId        || undefined,
    paymentMethodId: paymentMethodId || undefined,
    startDate:       startDate       || undefined,
    endDate:         endDate         || undefined,
  });

  const payments   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;
  const hasFilter  = !!(paymentMethodId || startDate || endDate);

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pembayaran Invoice</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} pembayaran` : "Riwayat pembayaran invoice"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Hari Ini</p>
              <p className="text-base font-bold mt-0.5 sm:text-lg">{formatCurrency(summary?.today.total ?? "0")}</p>
              <p className="text-xs text-muted-foreground">{summary?.today.count ?? 0} transaksi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">{startDate || endDate ? "Periode Filter" : "Semua Waktu"}</p>
              <p className="text-base font-bold mt-0.5 sm:text-lg">{formatCurrency(summary?.period.total ?? "0")}</p>
              <p className="text-xs text-muted-foreground">{summary?.period.count ?? 0} transaksi</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter + list card */}
        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <div className="col-span-2 flex flex-col gap-1 sm:col-auto">
                <Label className="text-xs text-muted-foreground">Metode Pembayaran</Label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => { setMethod(e.target.value); setPage(1); }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                >
                  <option value="">Semua Metode</option>
                  {methodsData.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-full sm:w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-full sm:w-36" />
              </div>

              {hasFilter && (
                <div className="col-span-2 flex items-end sm:col-auto">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setMethod(""); setStart(""); setEnd(""); setPage(1); }}
                    className="h-9 w-full text-xs sm:w-auto"
                  >
                    Reset Filter
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : payments.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada pembayaran.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-border">
                  {payments.map((p) => (
                    <PaymentCard key={p.id} payment={p} canDelete={canDelete} onDelete={() => setDeleteTarget(p)} />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Pembayaran</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Invoice</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metode</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Jumlah</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ref</th>
                        <th className="px-4 py-3" />
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs font-mono">{p.paymentNo}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/invoices/${p.invoiceId}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {p.invoice?.invoiceNo ?? "—"}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{p.invoice?.customer?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{p.invoice?.customer?.mobilePhone ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                          <td className="px-4 py-3">{p.paymentMethod?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{p.referenceNo ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/invoices/${p.invoiceId}`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Lihat invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                title="Hapus pembayaran"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl sm:rounded-lg">
          <DialogHeader><DialogTitle>Hapus Pembayaran Invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus pembayaran{" "}
            <span className="font-medium text-foreground">{deleteTarget?.paymentNo}</span>?
            Sisa tagihan invoice akan disesuaikan. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 sm:flex-none">Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="flex-1 sm:flex-none"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {deleteMutation.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ── Mobile payment card ───────────────────────────────────────────────────────
function PaymentCard({ payment: p, canDelete, onDelete }: {
  payment:   InvoicePayment;
  canDelete: boolean;
  onDelete:  () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{p.invoice?.customer?.name ?? "—"}</p>
            {p.invoice?.customer?.mobilePhone && (
              <p className="text-xs text-muted-foreground">{p.invoice.customer.mobilePhone}</p>
            )}
          </div>
          <span className="text-sm font-bold text-green-700 shrink-0">{formatCurrency(p.amount)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Badge variant="outline" className="text-xs font-mono">{p.paymentNo}</Badge>
          {p.invoice?.invoiceNo && (
            <Link to={`/invoices/${p.invoiceId}`} className="text-xs text-primary hover:underline font-mono">
              {p.invoice.invoiceNo}
            </Link>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</span>
          <span className="text-xs text-muted-foreground">{p.paymentMethod?.name ?? "—"}</span>
          {p.referenceNo && <span className="text-xs text-muted-foreground">Ref: {p.referenceNo}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <Link
          to={`/invoices/${p.invoiceId}`}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Lihat invoice"
        >
          <Eye className="h-4 w-4" />
        </Link>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Hapus pembayaran"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
