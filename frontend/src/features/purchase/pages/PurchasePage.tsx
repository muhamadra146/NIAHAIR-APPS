import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Search, RefreshCw, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePurchaseInvoices, useSyncSuppliers } from "../hooks";
import { CreatePurchaseInvoiceDialog } from "../components/CreatePurchaseInvoiceDialog";
import type { PurchaseInvoice } from "../types";

type SyncFilter = "" | "SYNCED" | "UNSYNCED" | "CANCELLED";

const fmt = (v: string | number) => `Rp ${Number(v).toLocaleString("id-ID")}`;

function SyncBadge({ invoice }: { invoice: PurchaseInvoice }) {
  if (invoice.status === "CANCELLED") {
    return <Badge variant="destructive">Batal</Badge>;
  }
  if (invoice.accuratePurchaseInvoiceId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
        ✓ Accurate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
      Menunggu Sync
    </span>
  );
}

function InvoiceRow({ invoice }: { invoice: PurchaseInvoice }) {
  const navigate = useNavigate();
  return (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => navigate(`/purchases/${invoice.id}`)}>
      <td className="px-4 py-3">
        <p className="font-mono text-sm font-medium">{invoice.invoiceNo}</p>
        {invoice.supplierInvoiceNo && (
          <p className="text-xs text-muted-foreground">Supplier: {invoice.supplierInvoiceNo}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm">{invoice.supplier.name}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {new Date(invoice.invoiceDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3">
        <SyncBadge invoice={invoice} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{fmt(invoice.grandTotal)}</td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" onClick={() => navigate(`/purchases/${invoice.id}`)}
          className="h-7 text-xs">
          Lihat
        </Button>
      </td>
    </tr>
  );
}

export function PurchasePage() {
  const { user } = useAuthStore();
  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  const [showCreate,   setShowCreate]  = useState(false);
  const [search,       setSearch]      = useState("");
  const [dSearch,      setDSearch]     = useState("");
  const [syncFilter,   setSyncFilter]  = useState<SyncFilter>("");
  const [page,         setPage]        = useState(1);

  const syncMutation = useSyncSuppliers();

  const filterParams = syncFilter === "SYNCED"    ? { status: "POSTED" as const, synced: true  }
                     : syncFilter === "UNSYNCED"   ? { status: "POSTED" as const, synced: false }
                     : syncFilter === "CANCELLED"  ? { status: "CANCELLED" as const }
                     : {};

  const { data, isLoading } = usePurchaseInvoices({
    search: dSearch || undefined,
    page,
    limit:  20,
    ...filterParams,
  });

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((handleSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => {
      setDSearch(val); setPage(1);
    }, 300);
  }

  return (
    <PageContainer
      title="Pembelian"
      subtitle="Faktur pembelian barang dari pemasok"
      action={
        <div className="flex gap-2">
          {isSuperUser && (
            <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="gap-1.5">
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Pemasok
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Buat Faktur
          </Button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari no faktur / pemasok..." className="pl-8 h-9" />
          </div>
          <select value={syncFilter} onChange={(e) => { setSyncFilter(e.target.value as SyncFilter); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Semua</option>
            <option value="SYNCED">✓ Synced ke Accurate</option>
            <option value="UNSYNCED">Menunggu Sync</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Memuat data...</div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada faktur pembelian</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">No Faktur</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pemasok</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <InvoiceRow key={inv.id} invoice={inv} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {meta.total} faktur · halaman {meta.currentPage} / {meta.totalPages}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages}>›</Button>
              </div>
            </div>
          )}
        </Card>

        <CreatePurchaseInvoiceDialog open={showCreate} onClose={() => setShowCreate(false)} />
      </div>
    </PageContainer>
  );
}
