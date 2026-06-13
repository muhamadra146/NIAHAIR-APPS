import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useInvoices } from "../hooks";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import type { InvoiceStatus } from "../types";

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

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant={status === "PAID" ? "default" : "outline"}
      className={`text-xs ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function InvoiceListPage() {
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
