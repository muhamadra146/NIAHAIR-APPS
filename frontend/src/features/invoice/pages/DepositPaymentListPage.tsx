import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search, Upload, X, ImageIcon, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { fetchPaymentMethods } from "@/features/settings/api/paymentMethod.api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAllDepositPayments, useCreateDepositPayment, useDeleteDepositPayment, useDepositPaymentSummary } from "../hooks";
import type { DepositPayment } from "../types";

import { fetchDeposits } from "../api";
import type { Deposit } from "../types";

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

export function DepositPaymentListPage() {
  const { branchId, user } = useAuthStore();
  const [page, setPage]               = useState(1);
  const [startDate, setStart]         = useState("");
  const [endDate, setEnd]             = useState("");
  const [paymentMethodId, setMethod]  = useState("");
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepositPayment | null>(null);

  const deleteMutation = useDeleteDepositPayment();
  const canDelete = user ? CAN_DELETE.includes(user.roleCode) : false;

  const { data: methodsData = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  const { data, isLoading } = useAllDepositPayments({
    page,
    limit:           20,
    branchId:        branchId        || undefined,
    paymentMethodId: paymentMethodId || undefined,
    startDate:       startDate       || undefined,
    endDate:         endDate         || undefined,
  });

  const { data: summary } = useDepositPaymentSummary({
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pembayaran Deposit</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} pembayaran` : "Riwayat pembayaran deposit"}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden xs:inline">Tambah </span>Pembayaran
          </Button>
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
          {/* Metode Pembayaran */}
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

          {/* Date range — grouped with s/d */}
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
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36 ml-2" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-4 w-20" />
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
                        <td className="px-5 py-3">
                          <Badge variant="outline" className="text-xs font-mono rounded-lg px-2 py-0.5 bg-slate-50 border-slate-200 text-slate-600">{p.paymentNo}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{p.deposit?.customer?.name ?? "—"}</p>
                          {p.deposit?.customer?.mobilePhone && (
                            <p className="text-xs text-muted-foreground">{p.deposit.customer.mobilePhone}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                        <td className="px-5 py-3 text-slate-600">{p.paymentMethod?.name ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs font-mono">{p.referenceNo ?? "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/deposits/${p.depositId}`}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                            >
                              Lihat <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-colors"
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

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl sm:rounded-lg">
          <DialogHeader><DialogTitle>Hapus Pembayaran Deposit</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus pembayaran{" "}
            <span className="font-medium text-foreground">{deleteTarget?.paymentNo}</span>?
            Deposit akan dikembalikan ke status <span className="font-medium text-foreground">Belum Dibayar</span>.
            Tindakan ini tidak dapat dibatalkan.
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

      <AddPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branchId={branchId ?? undefined}
        onSuccess={() => { setDialogOpen(false); setPage(1); }}
      />
    </PageContainer>
  );
}

// ── Mobile payment card ───────────────────────────────────────────────────────
function PaymentCard({ payment: p, canDelete, onDelete }: {
  payment:   DepositPayment;
  canDelete: boolean;
  onDelete:  () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{p.deposit?.customer?.name ?? "—"}</p>
            {p.deposit?.customer?.mobilePhone && (
              <p className="text-xs text-muted-foreground">{p.deposit.customer.mobilePhone}</p>
            )}
          </div>
          <span className="text-sm font-bold text-green-700 shrink-0">{formatCurrency(p.amount)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Badge variant="outline" className="text-xs font-mono">{p.paymentNo}</Badge>
          <span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>
          <span className="text-xs text-muted-foreground">{p.paymentMethod?.name ?? "—"}</span>
          {p.referenceNo && <span className="text-xs text-muted-foreground">Ref: {p.referenceNo}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <Link
          to={`/deposits/${p.depositId}`}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Lihat deposit"
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

// ── Add payment dialog ────────────────────────────────────────────────────────
function AddPaymentDialog({
  open, onOpenChange, branchId, onSuccess,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  branchId?:    string;
  onSuccess:    () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [custSearch, setCustSearch]     = useState("");
  const [custResults, setCustResults]   = useState<{ id: string; name: string; mobilePhone: string | null }[]>([]);
  const [selectedCust, setSelectedCust] = useState<{ id: string; name: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [deposits, setDeposits]               = useState<Deposit[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  const [methodId, setMethodId]           = useState("");
  const [paidAt, setPaidAt]               = useState(todayStr);
  const [refNo, setRefNo]                 = useState("");
  const [notes, setNotes]                 = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const createMutation = useCreateDepositPayment(selectedDeposit?.id ?? "");

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn:  () => fetchPaymentMethods({ isActive: true, limit: 50 }).then((r) => r.data),
  });

  function reset() {
    setCustSearch(""); setCustResults([]); setSelectedCust(null);
    setDeposits([]); setSelectedDeposit(null);
    setMethodId(""); setPaidAt(todayStr); setRefNo(""); setNotes("");
    setTransferProof(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setError(null);
  }

  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  function handleCustSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setCustSearch(q); setSelectedCust(null); setDeposits([]); setSelectedDeposit(null);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setCustResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetchCustomers({ search: q, limit: 8 });
      setCustResults((res.data as unknown as typeof custResults) ?? []);
    }, 300);
  }

  async function selectCustomer(c: { id: string; name: string; mobilePhone: string | null }) {
    setSelectedCust(c); setCustSearch(""); setCustResults([]); setSelectedDeposit(null);
    setLoadingDeposits(true);
    try {
      const res = await fetchDeposits({ customerId: c.id, status: "UNPAID", limit: 50, branchId });
      setDeposits(res.data ?? []);
    } finally { setLoadingDeposits(false); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file) { setTransferProof(file); setPreviewUrl(URL.createObjectURL(file)); }
    else { setTransferProof(null); setPreviewUrl(null); }
  }

  function removeFile() {
    setTransferProof(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeposit) { setError("Pilih deposit terlebih dahulu"); return; }
    if (!methodId) { setError("Pilih metode pembayaran"); return; }
    setError(null);
    try {
      await createMutation.mutateAsync({
        paymentMethodId: methodId,
        paidAt:          paidAt ? new Date(paidAt).toISOString() : undefined,
        referenceNo:     refNo         || undefined,
        notes:           notes         || undefined,
        transferProof:   transferProof ?? undefined,
      });
      onSuccess(); reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Tambah Pembayaran Deposit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Customer */}
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={selectedCust ? selectedCust.name : custSearch}
                onChange={handleCustSearch}
                onClick={() => { if (selectedCust) { setSelectedCust(null); setDeposits([]); setSelectedDeposit(null); } }}
                placeholder="Cari customer..."
                className="pl-8"
              />
            </div>
            {!selectedCust && custResults.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm">
                {custResults.map((c) => (
                  <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <span className="font-medium">{c.name}</span>
                    {c.mobilePhone && <span className="ml-2 text-xs text-muted-foreground">{c.mobilePhone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Deposit selection */}
          {selectedCust && (
            <div className="flex flex-col gap-1.5">
              <Label>Deposit (Belum Dibayar) *</Label>
              {loadingDeposits ? (
                <Skeleton className="h-10 w-full" />
              ) : deposits.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Tidak ada deposit UNPAID untuk customer ini.</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDeposit(d)}
                      className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedDeposit?.id === d.id ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatCurrency(d.amount)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                      </div>
                      {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment form */}
          {selectedDeposit && (
            <>
              <div className="rounded-md bg-muted/50 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total dibayar</span>
                  <span className="text-base font-bold text-primary">{formatCurrency(selectedDeposit.amount)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Metode Pembayaran *</Label>
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Pilih metode pembayaran</option>
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tanggal Pembayaran *</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>No. Referensi</Label>
                <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="No. transfer / kwitansi (opsional)" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Catatan</Label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Bukti Transfer <span className="text-xs font-normal text-muted-foreground">(opsional)</span></Label>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={handleFileChange} />
                {!transferProof ? (
                  <button type="button" onClick={() => fileInput.current?.click()}
                    className="flex items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Upload className="h-4 w-4 shrink-0" />
                    <span>Klik untuk upload foto bukti transfer</span>
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-md border border-input bg-muted/30">
                    {previewUrl
                      ? <img src={previewUrl} alt="Bukti transfer" className="max-h-40 w-full object-contain" />
                      : <div className="flex items-center gap-2 px-4 py-3"><ImageIcon className="h-4 w-4 text-muted-foreground" /><span className="truncate text-sm">{transferProof.name}</span></div>
                    }
                    <button type="button" onClick={removeFile}
                      className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-0.5 text-muted-foreground shadow hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1 sm:flex-none">Batal</Button>
            <Button type="submit" disabled={!selectedDeposit || createMutation.isPending} className="flex-1 sm:flex-none">
              {createMutation.isPending ? "Memproses…" : "Konfirmasi Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
