import { useState } from "react";
import { ArrowDown, ArrowUp, Package, Search, Check, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useInventories, useStockMovements, useStockTransfers, useCreateStockTransfer, useUpdateTransferStatus } from "../hooks";
import { fetchWarehouses } from "@/features/settings/api/warehouse.api";
import { fetchInvoiceItems } from "@/features/invoice/api";
import type { StockTransfer, CreateTransferInput } from "../types";
import { ArrowLeftRight, Plus, Trash2, TruckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TABS = [
  { key: "stock",     label: "Stok" },
  { key: "movements", label: "Mutasi" },
  { key: "transfers", label: "Transfer" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function InventoryPage() {
  const { branchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Inventory</h1>
          <p className="text-sm text-muted-foreground">Saldo stok dan mutasi barang</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "stock"     && <StockTab branchId={branchId} />}
        {activeTab === "movements" && <MovementsTab branchId={branchId} />}
        {activeTab === "transfers" && <TransferTab branchId={branchId} />}
      </div>
    </PageContainer>
  );
}

// ── Stock balance tab ─────────────────────────────────────────────────────────

function StockTab({ branchId }: { branchId?: string | null }) {
  const [page, setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 300);
  }

  const { data, isLoading } = useInventories({
    page, limit: 30,
    branchId: branchId ?? undefined,
    search:   debouncedSearch || undefined,
  });
  const inventories = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 30) : 1;

  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={handleSearch} placeholder="Cari barang..." className="pl-8 h-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : inventories.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data stok.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Di Tangan</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tersedia</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Update Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {inventories.map((inv) => {
                    const onHand    = Number(inv.qtyOnHand);
                    const available = Number(inv.qtyAvailable);
                    return (
                      <tr key={inv.id} className="border-b border-border transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{inv.item.name}</p>
                          {inv.item.itemCode && <p className="text-xs text-muted-foreground">{inv.item.itemCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.warehouse.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{onHand.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${available < 0 ? "text-red-600" : "text-foreground"}`}>
                            {available.toLocaleString("id-ID")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {inventories.map((inv) => {
                const onHand    = Number(inv.qtyOnHand);
                const available = Number(inv.qtyAvailable);
                return (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium">{inv.item.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.warehouse.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Di tangan: {onHand.toLocaleString("id-ID")}</p>
                      <p className={`text-sm font-semibold ${available < 0 ? "text-red-600" : ""}`}>
                        Tersedia: {available.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm px-4 py-3 border-t">
          <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Stock movements tab ───────────────────────────────────────────────────────

const MOVEMENT_TYPE_TABS = [
  { key: "",    label: "Semua" },
  { key: "IN",  label: "Masuk" },
  { key: "OUT", label: "Keluar" },
] as const;

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE:        "Pembelian",
  SALE:            "Penjualan",
  SERVICE_USAGE:   "Pemakaian",
  PRODUCTION:      "Produksi",
  TRANSFER_IN:     "Transfer Masuk",
  TRANSFER_OUT:    "Transfer Keluar",
  ADJUSTMENT:      "Penyesuaian",
  OPENING_BALANCE: "Saldo Awal",
  RETURN:          "Return",
  SYNC:            "Sinkronisasi",
};

function MovementsTab({ branchId }: { branchId?: string | null }) {
  const [page, setPage]       = useState(1);
  const [type, setType]       = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");

  const { data, isLoading } = useStockMovements({
    page, limit: 30,
    direction: (type as "IN" | "OUT" | "") || undefined,
    branchId:  branchId ?? undefined,
    startDate: startDate || undefined,
    endDate:   endDate || undefined,
  });

  const movements  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 30) : 1;

  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <div className="flex gap-1 flex-wrap mb-3">
          {MOVEMENT_TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setType(tab.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                type === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Dari</Label>
            <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sampai</Label>
            <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-36" />
          </div>
          {(startDate || endDate) && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setStart(""); setEnd(""); setPage(1); }} className="h-9 text-xs">Reset</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : movements.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada mutasi stok.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo Sebelum</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo Sesudah</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referensi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const isIn = Number(m.qtyChange) > 0;
                    return (
                    <tr key={m.id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.inventory.item.name}</p>
                        {m.inventory.item.itemCode && <p className="text-xs text-muted-foreground">{m.inventory.item.itemCode}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.inventory.warehouse.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs gap-1 ${isIn ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                          {isIn ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                          {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{Math.abs(Number(m.qtyChange)).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.qtyBefore).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.qtyAfter).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        {(m.referenceType || m.referenceNo) && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {m.referenceNo ?? `${m.referenceType} …${m.referenceId?.slice(-8).toUpperCase()}`}
                          </span>
                        )}
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(m.createdAt)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {movements.map((m) => {
                const isIn = Number(m.qtyChange) > 0;
                return (
                <div key={m.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{m.inventory.item.name}</p>
                      <p className="text-xs text-muted-foreground">{m.inventory.warehouse.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`text-xs gap-1 ${isIn ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                        {isIn ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {Math.abs(Number(m.qtyChange)).toLocaleString("id-ID")}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">
                      {m.referenceNo ?? (m.referenceType && m.referenceId ? `${m.referenceType} …${m.referenceId.slice(-8).toUpperCase()}` : "—")}
                    </span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm px-4 py-3 border-t">
          <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Stock Transfer tab ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",   className: "text-yellow-700 border-yellow-300 bg-yellow-50" },
  IN_TRANSIT: { label: "Dikirim",   className: "text-blue-700 border-blue-300 bg-blue-50" },
  RECEIVED:   { label: "Diterima",  className: "text-green-700 border-green-300 bg-green-50" },
};

interface TransferItemLine { itemId: string; qty: number; itemName: string; }

function TransferTab({ branchId }: { branchId?: string | null }) {
  const { user } = useAuthStore();
  const [page, setPage]             = useState(1);
  const [filterStatus, setStatus]   = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useStockTransfers({
    page, limit: 20, branchId: branchId ?? undefined,
    status: filterStatus as "PENDING" | "IN_TRANSIT" | "RECEIVED" | "" || undefined,
  });
  const transfers  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  const updateStatusMut = useUpdateTransferStatus();

  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  function canKirim(t: typeof transfers[number]) {
    if (t.status !== "PENDING") return false;
    if (isSuperUser) return true;
    return !t.sourceWarehouse.branchId || t.sourceWarehouse.branchId === branchId;
  }

  function canTerima(t: typeof transfers[number]) {
    if (t.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !t.destinationWarehouse.branchId || t.destinationWarehouse.branchId === branchId;
  }

  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleAction(id: string, status: string) {
    updateStatusMut.mutate({ id, status, branchId }, {
      onSuccess: () => toast.success("Status transfer berhasil diperbarui"),
      onError:   (e: Error) => toast.error(e.message),
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 flex-wrap">
              {[
                { key: "",           label: "Semua" },
                { key: "PENDING",    label: "Pending" },
                { key: "IN_TRANSIT", label: "Dikirim" },
                { key: "RECEIVED",   label: "Diterima" },
              ].map((s) => (
                <button key={s.key} onClick={() => { setStatus(s.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterStatus === s.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Buat Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Belum ada transfer stok.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Transfer</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dari</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ke</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => {
                      const s        = STATUS_LABELS[t.status];
                      const expanded = expandedId === t.id;
                      return (
                        <>
                          <tr key={t.id}
                            className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleExpand(t.id)}>
                            <td className="px-4 py-3 font-mono text-sm font-medium">{t.transferNo}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(t.transferDate)}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{t.sourceWarehouse.name}</p>
                              {t.sourceWarehouse.branch && (
                                <p className="text-xs text-muted-foreground">{t.sourceWarehouse.branch.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{t.destinationWarehouse.name}</p>
                              {t.destinationWarehouse.branch && (
                                <p className="text-xs text-muted-foreground">{t.destinationWarehouse.branch.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{t.items.length} item</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-xs ${s?.className ?? ""}`}>{s?.label ?? t.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              {canKirim(t) && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  disabled={updateStatusMut.isPending}
                                  onClick={() => handleAction(t.id, "IN_TRANSIT")}>
                                  <TruckIcon className="h-3 w-3" /> Kirim
                                </Button>
                              )}
                              {canTerima(t) && (
                                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                  disabled={updateStatusMut.isPending}
                                  onClick={() => handleAction(t.id, "RECEIVED")}>
                                  <Check className="h-3 w-3" /> Terima
                                </Button>
                              )}
                            </td>
                          </tr>
                          {expanded && (
                            <tr key={`${t.id}-detail`} className="bg-muted/20">
                              <td colSpan={7} className="px-6 pb-3 pt-0">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Detail Item</p>
                                <div className="flex flex-wrap gap-2">
                                  {t.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-1.5 bg-background border border-border rounded px-2.5 py-1 text-xs">
                                      <span className="font-medium">{item.item.name}</span>
                                      <span className="text-muted-foreground">·</span>
                                      <span className="font-semibold">{Number(item.qty).toLocaleString("id-ID")} pcs</span>
                                    </div>
                                  ))}
                                </div>
                                {t.notes && <p className="text-xs text-muted-foreground mt-1.5">Catatan: {t.notes}</p>}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {transfers.map((t) => {
                  const s        = STATUS_LABELS[t.status];
                  const expanded = expandedId === t.id;
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                        <p className="font-mono text-sm font-medium">{t.transferNo}</p>
                        <Badge variant="outline" className={`text-xs ${s?.className ?? ""}`}>{s?.label ?? t.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>{t.sourceWarehouse.name}</span>
                        <span className="mx-2">→</span>
                        <span>{t.destinationWarehouse.name}</span>
                      </div>
                      {expanded && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {t.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs">
                              <span>{item.item.name}</span>
                              <span className="font-semibold">{Number(item.qty).toLocaleString("id-ID")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatDate(t.transferDate)} · {t.items.length} item</span>
                        <div className="flex gap-1">
                          {canKirim(t) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              disabled={updateStatusMut.isPending}
                              onClick={() => handleAction(t.id, "IN_TRANSIT")}>
                              <TruckIcon className="h-3 w-3" /> Kirim
                            </Button>
                          )}
                          {canTerima(t) && (
                            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                              disabled={updateStatusMut.isPending}
                              onClick={() => handleAction(t.id, "RECEIVED")}>
                              <Check className="h-3 w-3" /> Terima
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm px-4 py-3 border-t">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>

      {showCreate && <CreateTransferDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}

// ── Create Transfer Dialog ────────────────────────────────────────────────────

function CreateTransferDialog({ onClose }: { onClose: () => void }) {
  const [sourceWarehouseId, setSource]    = useState("");
  const [destinationWarehouseId, setDest] = useState("");
  const [transferDate, setDate]           = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes]                 = useState("");
  const [lines, setLines]                 = useState<TransferItemLine[]>([]);
  const [itemSearch, setItemSearch]       = useState("");
  const [dSearch, setDSearch]             = useState("");
  const [showItemDrop, setShowItemDrop]   = useState(false);

  const { data: whData } = useQuery({
    queryKey: ["warehouses-all"],
    queryFn:  () => fetchWarehouses({ limit: 100 }),
    staleTime: 60_000,
  });
  const warehouses = whData?.data ?? [];

  const { data: itemResults } = useQuery({
    queryKey:  ["item-search-transfer", dSearch],
    queryFn:   () => fetchInvoiceItems(dSearch),
    enabled:   dSearch.length >= 2,
    staleTime: 10_000,
  });

  const createTransfer = useCreateStockTransfer();

  function handleItemSearchChange(val: string) {
    setItemSearch(val);
    clearTimeout((handleItemSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleItemSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setDSearch(val), 300);
    setShowItemDrop(val.length >= 2);
  }

  function selectItem(item: { id: string; name: string }) {
    if (lines.find((l) => l.itemId === item.id)) { setShowItemDrop(false); return; }
    setLines((prev) => [...prev, { itemId: item.id, qty: 1, itemName: item.name }]);
    setItemSearch(""); setDSearch(""); setShowItemDrop(false);
  }

  function updateQty(itemId: string, qty: number) {
    setLines((prev) => prev.map((l) => l.itemId === itemId ? { ...l, qty } : l));
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function handleSubmit() {
    if (!sourceWarehouseId)      return toast.error("Pilih gudang asal");
    if (!destinationWarehouseId) return toast.error("Pilih gudang tujuan");
    if (sourceWarehouseId === destinationWarehouseId) return toast.error("Gudang asal dan tujuan tidak boleh sama");
    if (lines.length === 0)      return toast.error("Tambahkan minimal 1 item");
    if (lines.some((l) => !l.qty || l.qty <= 0)) return toast.error("Qty harus lebih dari 0");

    createTransfer.mutate(
      {
        sourceWarehouseId,
        destinationWarehouseId,
        transferDate,
        notes: notes || undefined,
        items: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      },
      {
        onSuccess: () => { toast.success("Transfer berhasil dibuat"); onClose(); },
        onError:   (e: Error) => toast.error(e.message),
      },
    );
  }

  const filteredResults = (itemResults ?? []).filter((it) => it.itemType === "INVENTORY");

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Transfer Stok</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Warehouses */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Gudang Asal <span className="text-destructive">*</span></Label>
              <select value={sourceWarehouseId} onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none">
                <option value="">— Pilih gudang —</option>
                {warehouses.filter((w) => w.isActive).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.branch ? ` (${w.branch.name})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Gudang Tujuan <span className="text-destructive">*</span></Label>
              <select value={destinationWarehouseId} onChange={(e) => setDest(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none">
                <option value="">— Pilih gudang —</option>
                {warehouses.filter((w) => w.isActive && w.id !== sourceWarehouseId).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.branch ? ` (${w.branch.name})` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Tanggal Transfer</Label>
              <Input type="date" value={transferDate} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Catatan</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="h-9" />
            </div>
          </div>

          {/* Item search */}
          <div className="space-y-2">
            <Label className="text-sm">Item</Label>

            {/* Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={itemSearch}
                onChange={(e) => handleItemSearchChange(e.target.value)}
                onFocus={() => { if (itemSearch.length >= 2) setShowItemDrop(true); }}
                onBlur={() => setTimeout(() => setShowItemDrop(false), 150)}
                placeholder="Ketik minimal 2 huruf untuk cari item..."
                className="pl-8 h-9"
              />
            </div>

            {/* Results — inline, NOT absolute, no overflow/z-index conflict */}
            {showItemDrop && filteredResults.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden shadow-sm">
                {filteredResults.slice(0, 8).map((it) => (
                  <button key={it.id} type="button" onMouseDown={() => selectItem(it)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0 flex items-center justify-between gap-2">
                    <span className="font-medium">{it.name}</span>
                    {it.itemCode && <span className="text-xs text-muted-foreground font-mono shrink-0">{it.itemCode}</span>}
                  </button>
                ))}
                {filteredResults.length > 8 && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted/30">
                    +{filteredResults.length - 8} item lainnya — perjelas pencarian
                  </p>
                )}
              </div>
            )}

            {/* Selected items */}
            {lines.length > 0 && (
              <div className="border rounded-md divide-y text-sm">
                {lines.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate">{line.itemName}</span>
                    <Input type="number" min={0.001} step={0.001} value={line.qty}
                      onChange={(e) => updateQty(line.itemId, parseFloat(e.target.value) || 0)}
                      className="h-7 w-24 text-right text-xs" />
                    <button type="button" onClick={() => removeLine(line.itemId)}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createTransfer.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Buat Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
