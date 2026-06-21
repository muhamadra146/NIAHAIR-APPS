import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Eye, Search, CreditCard, Receipt,
  TrendingUp, Clock, CheckCircle2, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useInvoices, useDeleteInvoice } from "../hooks";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import type { Invoice, InvoiceStatus } from "../types";

const CAN_DELETE: string[] = ["SUPER_ADMIN", "OWNER", "MANAGER"];

// ── Shared ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID:    "Belum Bayar",
  PAID:      "Lunas",
  CANCELLED: "Dibatalkan",
};

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  UNPAID:    "bg-red-50 text-red-600 border-red-200",
  PAID:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
};

const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium rounded-lg px-2 py-0.5", STATUS_BADGE[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// ── Kasir POS View ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-3 sm:p-4", color)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/80">{label}</p>
        <p className="truncate text-lg font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-white/70">{sub}</p>}
      </div>
    </div>
  );
}

function KasirInvoiceCard({
  inv,
  onPayClick,
}: {
  inv: Invoice;
  onPayClick: (inv: Invoice) => void;
}) {
  const isPending = inv.status === "UNPAID";
  const items     = inv.items ?? [];
  const itemLabel = items.length === 1
    ? (items[0]?.item?.name ?? "1 item")
    : `${items.length} item`;

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
        isPending
          ? "border-orange-200 hover:border-orange-300"
          : "border-slate-100/80 hover:border-slate-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-800 truncate">
              {inv.customer?.name ?? "—"}
            </p>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="mt-0.5 text-xs font-mono text-slate-400">{inv.invoiceNo}</p>
          <p className="mt-1 text-xs text-slate-400 truncate">{itemLabel}</p>
          <p className="mt-0.5 text-xs text-slate-400">{formatDate(inv.invoiceDate)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-slate-400">Grand Total</p>
            <p className="text-base font-bold text-slate-800">{formatCurrency(inv.grandTotal)}</p>
          </div>
          {isPending && Number(inv.outstandingAmount) > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Sisa Bayar</p>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(inv.outstandingAmount)}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" asChild>
              <Link to={`/invoices/${inv.id}`}>
                <Eye className="mr-1 h-3 w-3" />Detail
              </Link>
            </Button>
            {isPending && (
              <Button
                size="sm"
                className="h-8 rounded-lg px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => onPayClick(inv)}
              >
                <CreditCard className="mr-1 h-3 w-3" />Bayar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KasirPOSView() {
  const { branchId }    = useAuthStore();
  const navigate        = useNavigate();
  const [search, setSearch]   = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [showPaid, setShowPaid] = useState(false);

  const today     = new Date().toISOString().slice(0, 10);
  const { data, isLoading } = useInvoices({
    branchId:  branchId || undefined,
    startDate: today,
    endDate:   today,
    limit: 100,
  });

  const invoices = data?.data ?? [];

  const unpaid = invoices.filter((i) => i.status === "UNPAID");
  const paid   = invoices.filter((i) => i.status === "PAID");
  const todayRevenue = paid.reduce((s, i) => s + Number(i.grandTotal), 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (i) =>
        i.customer?.name?.toLowerCase().includes(q) ||
        i.invoiceNo.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const filteredUnpaid = filtered.filter((i) => i.status === "UNPAID");
  const filteredPaid   = filtered.filter((i) => i.status === "PAID");

  function handlePayClick(inv: Invoice) {
    navigate(`/invoices/${inv.id}`);
  }

  return (
    <PageContainer>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">POS Kasir</h1>
            <p className="text-sm text-muted-foreground">Transaksi hari ini</p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            disabled={!branchId}
            className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Buat Invoice
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu.
          </p>
        )}

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={TrendingUp}   label="Omzet Hari Ini" value={formatCurrency(todayRevenue)}  color="bg-gradient-to-br from-pink-500 to-rose-600" />
            <StatCard icon={Receipt}      label="Total Invoice"  value={String(invoices.length)}        color="bg-gradient-to-br from-violet-500 to-purple-600" />
            <StatCard icon={CheckCircle2} label="Lunas"          value={String(paid.length)}            color="bg-gradient-to-br from-emerald-500 to-green-600" />
            <StatCard icon={Clock}        label="Belum Bayar"    value={String(unpaid.length)}          color={unpaid.length > 0 ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-slate-400 to-slate-500"} />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama customer atau no. invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl border-slate-200 pl-10 shadow-sm text-sm transition-shadow hover:shadow-md focus-visible:shadow-md"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* UNPAID section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <h2 className="text-sm font-semibold text-slate-700">
                  Perlu Dibayar
                  {filteredUnpaid.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600 font-bold">
                      {filteredUnpaid.length}
                    </span>
                  )}
                </h2>
              </div>
              {filteredUnpaid.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-medium text-slate-500">Semua sudah lunas!</p>
                  <p className="text-xs text-slate-400">Tidak ada transaksi yang menunggu pembayaran</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUnpaid.map((inv) => (
                    <KasirInvoiceCard key={inv.id} inv={inv} onPayClick={handlePayClick} />
                  ))}
                </div>
              )}
            </div>

            {/* PAID section — collapsible */}
            {filteredPaid.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPaid((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-slate-700 flex-1">
                    Sudah Lunas
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600 font-bold">
                      {filteredPaid.length}
                    </span>
                  </h2>
                  {showPaid
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </button>
                {showPaid && (
                  <div className="space-y-2">
                    {filteredPaid.map((inv) => (
                      <KasirInvoiceCard key={inv.id} inv={inv} onPayClick={handlePayClick} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {invoices.length === 0 && !search && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <Receipt className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Belum ada transaksi hari ini</p>
                <p className="mt-1 text-xs text-slate-400">Tekan "Buat Invoice" untuk mulai transaksi</p>
                <Button onClick={() => setFormOpen(true)} className="mt-4 rounded-xl bg-pink-600 hover:bg-pink-700" size="sm" disabled={!branchId}>
                  <Plus className="mr-2 h-4 w-4" />Buat Invoice Pertama
                </Button>
              </div>
            )}

            {invoices.length > 0 && search && filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                Tidak ada invoice untuk "<strong>{search}</strong>"
              </div>
            )}
          </>
        )}
      </div>

      <CreateInvoiceDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
      />
    </PageContainer>
  );
}

// ── Management Table View ─────────────────────────────────────────────────────

function ManagementView() {
  const { branchId, user } = useAuthStore();
  const [page, setPage]               = useState(1);
  const [status, setStatus]           = useState<InvoiceStatus | "">("");
  const [startDate, setStart]         = useState("");
  const [endDate, setEnd]             = useState("");
  const [formOpen, setFormOpen]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const deleteMutation = useDeleteInvoice(deleteTarget?.id ?? "");
  const canDelete = user ? CAN_DELETE.includes(user.roleCode) : false;

  const { data, isLoading } = useInvoices({
    page, limit: 20,
    branchId:  branchId || undefined,
    status:    status   || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });

  const invoices   = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  return (
    <PageContainer>
      <div className="space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Invoice / POS</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} invoice` : "Kelola transaksi penjualan"}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Buat Invoice
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu.
          </p>
        )}

        {/* Filter + table card */}
        <Card className="rounded-2xl border border-slate-100/80 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</Label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as InvoiceStatus | ""); setPage(1); }}
                  className={`${filterInputCls} px-3 text-sm`}
                >
                  <option value="">Semua status</option>
                  {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className={`${filterInputCls} w-36`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className={`${filterInputCls} w-36`} />
              </div>
              {(status || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs text-slate-500 hover:text-slate-800">
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : invoices.length === 0 ? (
              <p className="py-14 text-center text-sm text-slate-400">Tidak ada invoice.</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-slate-400">{inv.invoiceNo}</p>
                        <p className="truncate text-sm font-medium text-slate-800">{inv.customer?.name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <InvoiceStatusBadge status={inv.status} />
                        <p className="text-xs font-semibold text-slate-800">{formatCurrency(inv.grandTotal)}</p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" asChild>
                            <Link to={`/invoices/${inv.id}`}><Eye className="mr-1 h-3 w-3" />Detail</Link>
                          </Button>
                          {canDelete && inv.status !== "PAID" && (
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 rounded-lg px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(inv)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">No. Invoice</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tanggal</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Sisa Bayar</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-3" />
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
                          <td className="px-5 py-4 font-mono text-xs text-slate-400">{inv.invoiceNo}</td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">{inv.customer?.name ?? "—"}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{inv.customer?.mobilePhone ?? ""}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-sm">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(inv.grandTotal)}</td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {Number(inv.outstandingAmount) > 0
                              ? <span className="text-red-600 font-semibold">{formatCurrency(inv.outstandingAmount)}</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-5 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                          <td className="px-5 py-4">
                            <Button variant="ghost" size="icon" className="rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" asChild>
                              <Link to={`/invoices/${inv.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          </td>
                          <td className="px-5 py-4">
                            {canDelete && inv.status !== "PAID" && (
                              <Button
                                variant="ghost" size="icon"
                                className="rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(inv)}
                                title="Hapus invoice"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
            <span className="text-slate-400">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>

      <CreateInvoiceDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl sm:rounded-lg">
          <DialogHeader><DialogTitle>Hapus Invoice?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Invoice{" "}
            <span className="font-mono font-medium text-foreground">{deleteTarget?.invoiceNo}</span>
            {" "}atas nama{" "}
            <span className="font-medium text-foreground">{deleteTarget?.customer?.name}</span>
            {" "}akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 sm:flex-none">Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="flex-1 sm:flex-none"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync();
                setDeleteTarget(null);
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

// ── Entry point — route by role ───────────────────────────────────────────────

export function InvoiceListPage() {
  const { user } = useAuthStore();
  const isCashier = user?.roleCode === "CASHIER";
  return isCashier ? <KasirPOSView /> : <ManagementView />;
}
