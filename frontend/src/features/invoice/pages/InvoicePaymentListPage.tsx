import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAllInvoicePayments, useInvoicePaymentSummary, useDeletePayment } from "../hooks";
import type { InvoicePayment } from "../types";

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

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
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
              <p className="text-xs font-medium text-slate-500">Hari Ini</p>
            </div>
            <p className="text-base font-bold tabular-nums text-emerald-700">{formatCurrency(summary?.today.total ?? "0")}</p>
            <p className="mt-0.5 text-xs text-slate-400">{summary?.today.count ?? 0} transaksi</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-blue-400" />
              <p className="text-xs font-medium text-slate-500">{startDate || endDate ? "Periode Filter" : "Semua Waktu"}</p>
            </div>
            <p className="text-base font-bold tabular-nums text-blue-700">{formatCurrency(summary?.period.total ?? "0")}</p>
            <p className="mt-0.5 text-xs text-slate-400">{summary?.period.count ?? 0} transaksi</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Metode Pembayaran</p>
            <select
              value={paymentMethodId}
              onChange={(e) => { setMethod(e.target.value); setPage(1); }}
              className={`${filterInputCls} px-3 text-sm w-44`}
            >
              <option value="">Semua Metode</option>
              {methodsData.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Periode</p>
            <div className="flex items-center gap-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStart(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
              <span className="text-muted-foreground text-xs px-1 select-none border-x border-slate-200 bg-slate-50/60 py-2">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEnd(e.target.value); setPage(1); }}
                className="h-9 bg-transparent px-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          {hasFilter && (
            <Button
              variant="ghost" size="sm"
              onClick={() => { setMethod(""); setStart(""); setEnd(""); setPage(1); }}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* Table — flat border, no card */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-400">Tidak ada pembayaran.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {payments.map((p) => (
                  <PaymentCard key={p.id} payment={p} canDelete={canDelete} onDelete={() => setDeleteTarget(p)} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">No. Pembayaran</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">No. Invoice</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Metode</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Jumlah</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ref</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className="text-xs font-mono rounded-lg px-2 py-0.5 bg-slate-50 border-slate-200 text-slate-600">{p.paymentNo}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/invoices/${p.invoiceId}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {p.invoice?.invoiceNo ?? "—"}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{p.invoice?.customer?.name ?? "—"}</p>
                          {p.invoice?.customer?.mobilePhone && (
                            <p className="text-xs text-muted-foreground">{p.invoice.customer.mobilePhone}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                        <td className="px-5 py-3.5 text-slate-600">{p.paymentMethod?.name ?? "—"}</td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{p.referenceNo ?? "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/invoices/${p.invoiceId}`}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                            >
                              Lihat <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

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
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-slate-800 truncate">{p.invoice?.customer?.name ?? "—"}</p>
            {p.invoice?.customer?.mobilePhone && (
              <p className="text-xs text-slate-400">{p.invoice.customer.mobilePhone}</p>
            )}
          </div>
          <span className="text-sm font-bold tabular-nums text-emerald-700 shrink-0">{formatCurrency(p.amount)}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Badge variant="outline" className="text-xs font-mono rounded-lg px-2 py-0.5 bg-slate-50 border-slate-200 text-slate-600">{p.paymentNo}</Badge>
          {p.invoice?.invoiceNo && (
            <Link to={`/invoices/${p.invoiceId}`} className="text-xs text-primary hover:underline font-mono">
              {p.invoice.invoiceNo}
            </Link>
          )}
          <span className="text-xs text-slate-400">{formatDate(p.paymentDate)}</span>
          <span className="text-xs text-slate-400">{p.paymentMethod?.name ?? "—"}</span>
          {p.referenceNo && <span className="text-xs text-slate-400">Ref: {p.referenceNo}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <Link
          to={`/invoices/${p.invoiceId}`}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
