import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Eye, Search, CreditCard, Receipt,
  TrendingUp, Clock, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useInvoices } from "../hooks";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import type { Invoice, InvoiceStatus } from "../types";

// ── Shared ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID:    "Belum Bayar",
  PAID:      "Lunas",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  UNPAID:    "text-red-600 border-red-300",
  PAID:      "bg-green-600 text-white border-transparent",
  CANCELLED: "text-gray-500 border-gray-300",
};

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-semibold", STATUS_COLOR[status])}
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
    <div className={cn("flex items-center gap-3 rounded-xl p-3 sm:p-4", color)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
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
        "group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
        isPending ? "border-orange-200 hover:border-orange-300" : "border-gray-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-gray-900 truncate">
              {inv.customer?.name ?? "—"}
            </p>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="mt-0.5 text-xs font-mono text-muted-foreground">{inv.invoiceNo}</p>
          <p className="mt-1 text-xs text-muted-foreground truncate">{itemLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
        </div>

        {/* Right: amounts + action */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(inv.grandTotal)}</p>
          </div>
          {isPending && Number(inv.outstandingAmount) > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Sisa Bayar</p>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(inv.outstandingAmount)}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" asChild>
              <Link to={`/invoices/${inv.id}`}>
                <Eye className="mr-1 h-3 w-3" />Detail
              </Link>
            </Button>
            {isPending && (
              <Button
                size="sm"
                className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white"
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

  // Load today's invoices
  const today     = new Date().toISOString().slice(0, 10);
  const { data, isLoading } = useInvoices({
    branchId:  branchId || undefined,
    startDate: today,
    endDate:   today,
    limit: 100,
  });

  const invoices = data?.data ?? [];

  // Stats
  const unpaid = invoices.filter((i) => i.status === "UNPAID");
  const paid   = invoices.filter((i) => i.status === "PAID");
  const todayRevenue = paid.reduce((s, i) => s + Number(i.grandTotal), 0);

  // Filter by search
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
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">POS Kasir</h1>
            <p className="text-sm text-muted-foreground">Transaksi hari ini</p>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            disabled={!branchId}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Buat Invoice
          </Button>
        </div>

        {!branchId && (
          <p className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu.
          </p>
        )}

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={TrendingUp}    label="Omzet Hari Ini"  value={formatCurrency(todayRevenue)}  color="bg-gradient-to-br from-pink-500 to-rose-600" />
            <StatCard icon={Receipt}       label="Total Invoice"   value={String(invoices.length)}        color="bg-gradient-to-br from-violet-500 to-purple-600" />
            <StatCard icon={CheckCircle2}  label="Lunas"           value={String(paid.length)}            color="bg-gradient-to-br from-emerald-500 to-green-600" />
            <StatCard icon={Clock}         label="Belum Bayar"     value={String(unpaid.length)}          color={unpaid.length > 0 ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-slate-400 to-slate-500"} />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama customer atau no. invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-10 text-sm"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* UNPAID section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Perlu Dibayar
                  {filteredUnpaid.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600 font-bold">
                      {filteredUnpaid.length}
                    </span>
                  )}
                </h2>
              </div>
              {filteredUnpaid.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-8 text-center">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                  <p className="text-sm font-medium text-gray-500">Semua sudah lunas!</p>
                  <p className="text-xs text-muted-foreground">Tidak ada transaksi yang menunggu pembayaran</p>
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
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-gray-700 flex-1">
                    Sudah Lunas
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-600 font-bold">
                      {filteredPaid.length}
                    </span>
                  </h2>
                  {showPaid
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
                <Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-gray-500">Belum ada transaksi hari ini</p>
                <p className="mt-1 text-xs text-muted-foreground">Tekan "Buat Invoice" untuk mulai transaksi</p>
                <Button onClick={() => setFormOpen(true)} className="mt-4 bg-pink-600 hover:bg-pink-700" size="sm" disabled={!branchId}>
                  <Plus className="mr-2 h-4 w-4" />Buat Invoice Pertama
                </Button>
              </div>
            )}

            {invoices.length > 0 && search && filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
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

// ── Management Table View (unchanged) ─────────────────────────────────────────

function ManagementView() {
  const { branchId } = useAuthStore();
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState<InvoiceStatus | "">("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [formOpen, setFormOpen] = useState(false);

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
      <div className="space-y-4 sm:space-y-6">
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
          <p className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            Pilih cabang terlebih dahulu.
          </p>
        )}

        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as InvoiceStatus | ""); setPage(1); }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Semua status</option>
                  {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-36" />
              </div>
              {(status || startDate || endDate) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setStatus(""); setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs">Reset</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : invoices.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada invoice.</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-border md:hidden">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">{inv.invoiceNo}</p>
                        <p className="truncate text-sm font-medium">{inv.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <InvoiceStatusBadge status={inv.status} />
                        <p className="text-xs font-semibold">{formatCurrency(inv.grandTotal)}</p>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                          <Link to={`/invoices/${inv.id}`}><Eye className="mr-1 h-3 w-3" />Detail</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Invoice</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sisa Bayar</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoiceNo}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{inv.customer?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{inv.customer?.mobilePhone ?? ""}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.grandTotal)}</td>
                          <td className="px-4 py-3 text-right">
                            {Number(inv.outstandingAmount) > 0
                              ? <span className="text-red-600 font-medium">{formatCurrency(inv.outstandingAmount)}</span>
                              : "—"}
                          </td>
                          <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/invoices/${inv.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
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

      <CreateInvoiceDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
      />
    </PageContainer>
  );
}

// ── Entry point — route by role ───────────────────────────────────────────────

export function InvoiceListPage() {
  const { user } = useAuthStore();
  const isCashier = user?.roleCode === "CASHIER";
  return isCashier ? <KasirPOSView /> : <ManagementView />;
}
