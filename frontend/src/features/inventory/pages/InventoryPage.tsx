import { useState } from "react";
import { ArrowDown, ArrowUp, Package, Search, Check, Loader2, SlidersHorizontal, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useInventories, useItemCategories, useStockMovements, useStockTransfers, useCreateStockTransfer, useUpdateTransferStatus, useCreateStockAdjustment, useGlAccounts, useCreateBatchStockAdjustment, useDeleteStockTransfer, useUndoTransferReceive } from "../hooks";
import { fetchWarehouses } from "@/features/settings/api/warehouse.api";
import { fetchInvoiceItems } from "@/features/invoice/api";
import type { StockTransfer, CreateTransferInput, InventoryBalance } from "../types";
import { ArrowLeftRight, Plus, Trash2, TruckIcon, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import type { SelectOption } from "@/components/ui/simple-select";

const TABS = [
  { key: "stock",       label: "Stok" },
  { key: "movements",   label: "Mutasi" },
  { key: "transfers",   label: "Transfer" },
  { key: "adjustment",  label: "Penyesuaian" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function InventoryPage() {
  const { branchId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  return (
    <PageContainer title="Inventori" subtitle="Saldo stok dan mutasi barang">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="stock"><StockTab branchId={branchId} /></TabsContent>
        <TabsContent value="movements"><MovementsTab branchId={branchId} /></TabsContent>
        <TabsContent value="transfers"><TransferTab branchId={branchId} /></TabsContent>
        <TabsContent value="adjustment"><BatchAdjustmentTab branchId={branchId} /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// ── Stock balance tab ─────────────────────────────────────────────────────────

function StockTab({ branchId }: { branchId?: string | null }) {
  const { user } = useAuthStore();
  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedSub, setSelectedSub]     = useState("");
  const [adjustTarget, setAdjustTarget]   = useState<InventoryBalance | null>(null);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer);
    (handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 300);
  }

  const { data: catData } = useItemCategories();
  const categories = catData ?? [];

  const parentCats = categories.filter((c) => !c.parentId);
  const childMap   = categories.reduce<Record<string, typeof categories>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});
  const currentSubs = selectedParent ? (childMap[selectedParent] ?? []) : [];

  function handleParentClick(id: string) {
    const next = selectedParent === id ? "" : id;
    setSelectedParent(next);
    setSelectedSub("");
    setPage(1);
  }

  function handleSubClick(id: string) {
    setSelectedSub((prev) => (prev === id ? "" : id));
    setPage(1);
  }

  function handleReset() {
    setSearch(""); setDebouncedSearch("");
    setSelectedParent(""); setSelectedSub("");
    setPage(1);
  }

  const { data, isLoading } = useInventories({
    page, limit: 30,
    branchId:        branchId ?? undefined,
    search:          debouncedSearch || undefined,
    parentCategoryId: selectedParent && !selectedSub ? selectedParent : undefined,
    categoryId:      selectedSub || undefined,
  });
  const inventories = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 30) : 1;

  const hasFilter = !!(debouncedSearch || selectedParent || selectedSub);

  return (
    <>
    <Card>
      <CardHeader className="pb-3 pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={handleSearch} placeholder="Cari barang..." className="pl-8 h-9" />
          </div>

          {/* Kategori dropdown */}
          <select
            value={selectedParent}
            onChange={(e) => { setSelectedParent(e.target.value); setSelectedSub(""); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Semua Kategori</option>
            {parentCats.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Sub kategori dropdown — hanya muncul jika parent dipilih & punya anak */}
          {selectedParent && currentSubs.length > 0 && (
            <select
              value={selectedSub}
              onChange={(e) => { setSelectedSub(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Semua Sub Kategori</option>
              {currentSubs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {hasFilter && (
            <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline shrink-0">
              Reset
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : inventories.length === 0 ? (
          <EmptyState title="Belum ada data stok" description="Tidak ada stok yang sesuai dengan filter" />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategori</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Di Tangan</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tersedia</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Update Terakhir</th>
                    {isSuperUser && <th className="px-4 py-3 w-10" />}
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
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inv.item.category?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.warehouse.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{onHand.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${available < 0 ? "text-red-600" : "text-foreground"}`}>
                            {available.toLocaleString("id-ID")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.updatedAt)}</td>
                        {isSuperUser && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setAdjustTarget(inv)}
                              title="Penyesuaian stok"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        )}
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
                      {inv.item.category && (
                        <p className="text-xs text-muted-foreground/70">{inv.item.category.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Di tangan: {onHand.toLocaleString("id-ID")}</p>
                        <p className={`text-sm font-semibold ${available < 0 ? "text-red-600" : ""}`}>
                          Tersedia: {available.toLocaleString("id-ID")}
                        </p>
                      </div>
                      {isSuperUser && (
                        <button
                          onClick={() => setAdjustTarget(inv)}
                          title="Penyesuaian stok"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      <Pagination page={page} limit={30} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
    </Card>

    {adjustTarget && (
      <AdjustStockDialog
        target={adjustTarget}
        onClose={() => setAdjustTarget(null)}
      />
    )}
    </>
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
  RETURN:          "Retur Pembelian",
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
          <EmptyState title="Belum ada mutasi stok" description="Tidak ada mutasi yang sesuai dengan filter" />
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

      <Pagination page={page} limit={30} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

// ── Stock Transfer tab ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",    className: "text-yellow-700 border-yellow-300 bg-yellow-50" },
  IN_TRANSIT: { label: "Dikirim",    className: "text-blue-700 border-blue-300 bg-blue-50" },
  RECEIVED:   { label: "Diterima",   className: "text-green-700 border-green-300 bg-green-50" },
  CANCELLED:  { label: "Dibatalkan", className: "text-red-700 border-red-300 bg-red-50" },
};

interface TransferItemLine { itemId: string; qty: number; itemName: string; }

function TransferTab({ branchId }: { branchId?: string | null }) {
  const { user } = useAuthStore();
  const isViewOnly = useViewOnly();
  const [page, setPage]             = useState(1);
  const [filterStatus, setStatus]   = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useStockTransfers({
    page, limit: 20, branchId: branchId ?? undefined,
    status: filterStatus as "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED" | "" || undefined,
  });
  const transfers  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  const updateStatusMut  = useUpdateTransferStatus();
  const deleteMut        = useDeleteStockTransfer();
  const undoReceiveMut   = useUndoTransferReceive();

  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  function canKirim(t: typeof transfers[number]) {
    if (t.status !== "PENDING") return false;
    if (isSuperUser) return true;
    return !t.sourceWarehouse.branchId || t.sourceWarehouse.branchId === branchId;
  }

  function canTerima(t: typeof transfers[number]) {
    if (t.status !== "IN_TRANSIT") return false;
    return !t.destinationWarehouse.branchId || t.destinationWarehouse.branchId === branchId;
  }

  function canDelete(t: typeof transfers[number]) {
    if (t.status !== "PENDING" && t.status !== "IN_TRANSIT") return false;
    if (isSuperUser) return true;
    return !t.sourceWarehouse.branchId || t.sourceWarehouse.branchId === branchId;
  }

  function canUndoReceive(t: typeof transfers[number]) {
    if (t.status !== "RECEIVED") return false;
    if (isSuperUser) return true;
    return !t.destinationWarehouse.branchId || t.destinationWarehouse.branchId === branchId;
  }

  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [receiveTarget, setReceiveTarget]  = useState<StockTransfer | null>(null);
  const [deleteTarget, setDeleteTarget]    = useState<StockTransfer | null>(null);
  const [undoTarget, setUndoTarget]        = useState<StockTransfer | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleAction(id: string, status: string) {
    updateStatusMut.mutate({ id, status, branchId }, {
      onSuccess: () => toast.success("Status transfer berhasil diperbarui"),
      onError:   (e: Error) => toast.error(e.message),
    });
  }

  function handleTerima(t: typeof transfers[number]) {
    setReceiveTarget(t);
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
                { key: "CANCELLED",  label: "Dibatalkan" },
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
            {!isViewOnly && (
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Buat Transfer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : transfers.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="w-6 h-6" />}
              title="Belum ada transfer stok"
              description="Buat transfer untuk memindahkan stok antar cabang"
            />
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
                              <div className="flex gap-1 justify-end">
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
                                    onClick={() => handleTerima(t)}>
                                    <Check className="h-3 w-3" /> Terima
                                  </Button>
                                )}
                                {canUndoReceive(t) && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                                    disabled={undoReceiveMut.isPending}
                                    onClick={() => setUndoTarget(t)}>
                                    <RotateCcw className="h-3 w-3" /> Batal Terima
                                  </Button>
                                )}
                                {canDelete(t) && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                    disabled={deleteMut.isPending}
                                    onClick={() => setDeleteTarget(t)}>
                                    <Trash2 className="h-3 w-3" /> Hapus
                                  </Button>
                                )}
                              </div>
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
                        <div className="flex gap-1 flex-wrap">
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
                              onClick={() => handleTerima(t)}>
                              <Check className="h-3 w-3" /> Terima
                            </Button>
                          )}
                          {canUndoReceive(t) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                              disabled={undoReceiveMut.isPending}
                              onClick={() => setUndoTarget(t)}>
                              <RotateCcw className="h-3 w-3" /> Batal Terima
                            </Button>
                          )}
                          {canDelete(t) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
                              disabled={deleteMut.isPending}
                              onClick={() => setDeleteTarget(t)}>
                              <Trash2 className="h-3 w-3" /> Hapus
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

        <Pagination page={page} limit={20} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showCreate && <CreateTransferDialog onClose={() => setShowCreate(false)} />}
      {receiveTarget && (
        <ReceiveDialog
          transfer={receiveTarget}
          branchId={branchId}
          onClose={() => setReceiveTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Transfer"
          description={
            deleteTarget.status === "PENDING"
              ? `Transfer ${deleteTarget.transferNo} akan dihapus permanen. Lanjutkan?`
              : `Transfer ${deleteTarget.transferNo} sudah dikirim. Penghapusan akan membatalkan transfer dan mengembalikan stok ke gudang asal. Mutasi barang tetap tercatat. Lanjutkan?`
          }
          confirmLabel="Hapus"
          confirmVariant="destructive"
          isPending={deleteMut.isPending}
          onConfirm={() => {
            deleteMut.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success("Transfer berhasil dihapus");
                setDeleteTarget(null);
              },
              onError: (e: Error) => toast.error(e.message),
            });
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {undoTarget && (
        <ConfirmDialog
          title="Batalkan Penerimaan"
          description={`Penerimaan transfer ${undoTarget.transferNo} akan dibatalkan. Stok akan dikurangi dari gudang tujuan dan status kembali ke Dikirim. Mutasi barang tetap tercatat. Lanjutkan?`}
          confirmLabel="Batalkan Penerimaan"
          confirmVariant="outline"
          isPending={undoReceiveMut.isPending}
          onConfirm={() => {
            undoReceiveMut.mutate(undoTarget.id, {
              onSuccess: () => {
                toast.success("Penerimaan transfer berhasil dibatalkan");
                setUndoTarget(null);
              },
              onError: (e: Error) => toast.error(e.message),
            });
          }}
          onCancel={() => setUndoTarget(null)}
        />
      )}
    </>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title, description, confirmLabel, confirmVariant = "default", isPending, onConfirm, onCancel,
}: {
  title:           string;
  description:     string;
  confirmLabel:    string;
  confirmVariant?: "default" | "destructive" | "outline";
  isPending:       boolean;
  onConfirm:       () => void;
  onCancel:        () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Receive Dialog (partial receive) ─────────────────────────────────────────

function ReceiveDialog({
  transfer,
  branchId,
  onClose,
}: {
  transfer: import("../types").StockTransfer;
  branchId?: string | null;
  onClose:   () => void;
}) {
  const inventoryItems = transfer.items.filter((it) => it.item.itemType === "INVENTORY");

  const [qtys, setQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(inventoryItems.map((it) => [it.itemId, String(Number(it.qty))]))
  );

  const updateStatusMut = useUpdateTransferStatus();

  function handleQtyChange(itemId: string, val: string) {
    setQtys((prev) => ({ ...prev, [itemId]: val }));
  }

  function handleSubmit() {
    for (const it of inventoryItems) {
      const val = Number(qtys[it.itemId]);
      if (isNaN(val) || val < 0) return toast.error(`Qty tidak valid untuk ${it.item.name}`);
      if (val > Number(it.qty))  return toast.error(`Qty terima tidak boleh melebihi qty kirim (${it.item.name})`);
    }

    const receivedItems = inventoryItems.map((it) => ({
      itemId:      it.itemId,
      receivedQty: Number(qtys[it.itemId]),
    }));

    updateStatusMut.mutate(
      { id: transfer.id, status: "RECEIVED", branchId, receivedItems },
      {
        onSuccess: () => { toast.success("Barang berhasil diterima"); onClose(); },
        onError:   (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Terima Barang — {transfer.transferNo}</DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-3">
          Dari: <span className="font-medium">{transfer.sourceWarehouse.name}</span>
          {" → "}
          Ke: <span className="font-medium">{transfer.destinationWarehouse.name}</span>
        </div>

        <div className="space-y-3">
          {inventoryItems.map((it) => {
            const sentQty = Number(it.qty);
            const val     = qtys[it.itemId] ?? String(sentQty);
            const num     = Number(val);
            const isShort = !isNaN(num) && num < sentQty;
            return (
              <div key={it.itemId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{it.item.name}</Label>
                  <span className="text-xs text-muted-foreground">Dikirim: {sentQty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={sentQty}
                    step="any"
                    value={val}
                    onChange={(e) => handleQtyChange(it.itemId, e.target.value)}
                    className="h-8 text-sm"
                  />
                  {isShort && (
                    <span className="text-xs text-amber-600 whitespace-nowrap">
                      -{sentQty - num} kurang
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={updateStatusMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={updateStatusMut.isPending}
            className="bg-green-600 hover:bg-green-700">
            {updateStatusMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Konfirmasi Terima
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <DialogHeader><DialogTitle>Buat Transfer Stok</DialogTitle></DialogHeader>

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

// ── Batch Adjustment Tab ──────────────────────────────────────────────────────

interface AdjustLine {
  inventoryId: string;
  itemName:    string;
  itemCode:    string | null;
  warehouseName: string;
  qtyOnHand:   number;
  defaultUnit: string | null;
  qtyActual:   string;
}

function BatchAdjustmentTab({ branchId }: { branchId?: string | null }) {
  const { user } = useAuthStore();
  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";

  const [glAccountId, setGlAccount] = useState("");
  const [reason, setReason]         = useState(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes]           = useState("");
  const [lines, setLines]           = useState<AdjustLine[]>([]);

  // Item search
  const [search, setSearch]       = useState("");
  const [dSearch, setDSearch]     = useState("");
  const [showDrop, setShowDrop]   = useState(false);

  const { data: glAccounts = [], refetch: refetchGl, isFetching: isRefetchingGl } = useGlAccounts({ usage: "STOCK_ADJUSTMENT" });
  const batchMutation = useCreateBatchStockAdjustment();

  const { data: searchData } = useInventories({
    search:  dSearch || undefined,
    branchId: branchId ?? undefined,
    limit:   20,
  });
  const searchResults = (searchData?.data ?? []).filter(
    (inv) => inv.item.itemType === "INVENTORY" && !lines.find((l) => l.inventoryId === inv.id)
  );

  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout((handleSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleSearchChange as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => {
      setDSearch(val);
    }, 300);
    setShowDrop(val.length >= 1);
  }

  function selectInventory(inv: InventoryBalance) {
    setLines((prev) => [
      ...prev,
      {
        inventoryId:  inv.id,
        itemName:     inv.item.name,
        itemCode:     inv.item.itemCode,
        warehouseName: inv.warehouse.name,
        qtyOnHand:    Number(inv.qtyOnHand),
        defaultUnit:  inv.item.defaultUnit?.name ?? null,
        qtyActual:    String(Number(inv.qtyOnHand)),
      },
    ]);
    setSearch(""); setDSearch(""); setShowDrop(false);
  }

  function updateQty(inventoryId: string, val: string) {
    setLines((prev) => prev.map((l) => l.inventoryId === inventoryId ? { ...l, qtyActual: val } : l));
  }

  function removeLine(inventoryId: string) {
    setLines((prev) => prev.filter((l) => l.inventoryId !== inventoryId));
  }

  function handleSubmit() {
    if (!glAccountId)    return toast.error("Pilih akun penyesuaian");
    if (!reason)         return toast.error("Pilih alasan penyesuaian");
    if (lines.length === 0) return toast.error("Tambahkan minimal 1 item");

    const invalidLine = lines.find((l) => l.qtyActual === "" || isNaN(parseFloat(l.qtyActual)) || parseFloat(l.qtyActual) < 0);
    if (invalidLine) return toast.error(`Qty aktual tidak valid untuk: ${invalidLine.itemName}`);

    batchMutation.mutate(
      {
        glAccountId,
        reason,
        notes: notes || undefined,
        items: lines.map((l) => ({ inventoryId: l.inventoryId, qtyActual: parseFloat(l.qtyActual) })),
      },
      {
        onSuccess: () => {
          setLines([]);
          setNotes("");
        },
      },
    );
  }

  if (!isSuperUser) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Hanya SUPER_ADMIN dan OWNER yang dapat melakukan penyesuaian stok.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header form */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div>
            <h2 className="text-sm font-semibold">Penyesuaian Persediaan</h2>
            <p className="text-xs text-muted-foreground">Sesuaikan stok banyak barang sekaligus — hasil akan disinkronkan ke Accurate</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* GL Account */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Akun Penyesuaian <span className="text-destructive">*</span></Label>
                <button
                  type="button"
                  onClick={() => refetchGl()}
                  disabled={isRefetchingGl}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Reload daftar akun dari database"
                >
                  {isRefetchingGl ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Reload
                </button>
              </div>
              <SimpleSelect
                value={glAccountId}
                onChange={setGlAccount}
                placeholder="— Pilih akun —"
                searchable
                searchPlaceholder="Cari nama atau nomor akun..."
                options={glAccounts.map((a): SelectOption => ({
                  value: a.id,
                  label: a.number ? `[${a.number}] ${a.name}` : a.name,
                }))}
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm">Alasan <span className="text-destructive">*</span></Label>
              <SimpleSelect
                value={reason}
                onChange={setReason}
                options={ADJUSTMENT_REASONS.map((r): SelectOption => ({ value: r, label: r }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm">Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Keterangan tambahan..."
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item search + table */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (search.length >= 1) setShowDrop(true); }}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Cari & tambah barang..."
              className="pl-8 h-9"
            />
            {showDrop && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-border rounded-md bg-popover shadow-md overflow-hidden">
                {searchResults.slice(0, 8).map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onMouseDown={() => selectInventory(inv)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-medium">{inv.item.name}</span>
                      {inv.item.itemCode && <span className="ml-2 text-xs text-muted-foreground font-mono">{inv.item.itemCode}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground">{inv.warehouse.name}</span>
                      <span className="ml-2 text-xs font-semibold">{Number(inv.qtyOnHand).toLocaleString("id-ID")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {lines.length === 0 ? (
            <EmptyState
              icon={<Package className="w-6 h-6" />}
              title="Belum ada item"
              description="Cari dan tambahkan barang di atas"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Barang</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stok Saat Ini</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground w-40">Qty Aktual</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selisih</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const parsed = parseFloat(line.qtyActual);
                      const diff   = isNaN(parsed) ? null : parsed - line.qtyOnHand;
                      return (
                        <tr key={line.inventoryId} className="border-b border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium">{line.itemName}</p>
                            {line.itemCode && <p className="text-xs text-muted-foreground font-mono">{line.itemCode}</p>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-sm">{line.warehouseName}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            {line.qtyOnHand.toLocaleString("id-ID")}
                            {line.defaultUnit && <span className="ml-1 text-xs text-muted-foreground">{line.defaultUnit}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min={0}
                              step={0.001}
                              value={line.qtyActual}
                              onChange={(e) => updateQty(line.inventoryId, e.target.value)}
                              className="h-8 text-right font-mono w-36 ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">
                            <span className={diff === null ? "text-muted-foreground" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}>
                              {diff === null ? "—" : diff > 0 ? `+${diff.toLocaleString("id-ID")}` : diff.toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => removeLine(line.inventoryId)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {lines.map((line) => {
                  const parsed = parseFloat(line.qtyActual);
                  const diff   = isNaN(parsed) ? null : parsed - line.qtyOnHand;
                  return (
                    <div key={line.inventoryId} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{line.itemName}</p>
                          <p className="text-xs text-muted-foreground">{line.warehouseName}</p>
                        </div>
                        <button onClick={() => removeLine(line.inventoryId)} className="text-muted-foreground hover:text-destructive mt-0.5">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          Stok: <span className="font-semibold text-foreground">{line.qtyOnHand.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-xs shrink-0">Aktual:</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.001}
                            value={line.qtyActual}
                            onChange={(e) => updateQty(line.inventoryId, e.target.value)}
                            className="h-7 text-right font-mono text-sm flex-1"
                          />
                        </div>
                        {diff !== null && (
                          <span className={`text-xs font-semibold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {diff > 0 ? `+${diff.toLocaleString("id-ID")}` : diff.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>

        {lines.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <p className="text-sm text-muted-foreground">{lines.length} item dipilih</p>
            <Button onClick={handleSubmit} disabled={batchMutation.isPending} className="gap-1.5">
              {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Penyesuaian
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Adjust Stock Dialog ────────────────────────────────────────────────────────

const ADJUSTMENT_REASONS = [
  "Selisih Stok",
  "Barang Rusak",
  "Barang Hilang",
  "Koreksi",
];

function AdjustStockDialog({ target, onClose }: { target: InventoryBalance; onClose: () => void }) {
  const currentQty                  = Number(target.qtyOnHand);
  const [qtyActual, setQty]         = useState<string>(String(currentQty));
  const [reason, setReason]         = useState(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes]           = useState("");
  const [glAccountId, setGlAccount] = useState("");

  const { data: glAccounts = [], refetch: refetchGl2, isFetching: isRefetchingGl2 } = useGlAccounts({ usage: "STOCK_ADJUSTMENT" });
  const adjustMutation = useCreateStockAdjustment();

  const parsed = parseFloat(qtyActual);
  const diff   = isNaN(parsed) ? null : parsed - currentQty;

  // Build multi-unit display: for each itemUnit, qty = qtyOnHand / conversionFactor
  const sortedUnits = target.item.itemUnits
    .filter((u) => Number(u.conversionFactor) > 0)
    .slice()
    .sort((a, b) => Number(a.conversionFactor) - Number(b.conversionFactor));

  const baseUnit = sortedUnits[0]; // smallest factor = base unit

  const unitDisplays = sortedUnits.map((u) => ({
    name: u.unit.name,
    qty:  currentQty / Number(u.conversionFactor),
  })).filter((u) => !isNaN(u.qty));

  // Conversion notice: "1 tube = 80 gram", relative to the base unit
  const conversionLines = sortedUnits.slice(1).map((u) => {
    const ratio = Number(u.conversionFactor) / Number(baseUnit?.conversionFactor ?? 1);
    return `1 ${u.unit.name} = ${ratio % 1 === 0 ? ratio.toLocaleString("id-ID") : ratio.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ${baseUnit?.unit.name ?? ""}`;
  });

  function handleSubmit() {
    if (qtyActual === "" || isNaN(parsed) || parsed < 0) {
      toast.error("Qty aktual tidak valid");
      return;
    }
    if (!reason) {
      toast.error("Alasan wajib dipilih");
      return;
    }
    if (!glAccountId) {
      toast.error("Akun penyesuaian wajib dipilih");
      return;
    }
    adjustMutation.mutate(
      { inventoryId: target.id, qtyActual: parsed, reason, glAccountId, notes: notes || undefined },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Item info */}
          <div className="rounded-md bg-muted/50 px-4 py-3 space-y-0.5">
            <p className="font-medium text-sm">{target.item.name}</p>
            {target.item.itemCode && (
              <p className="text-xs text-muted-foreground font-mono">{target.item.itemCode}</p>
            )}
            <p className="text-xs text-muted-foreground">{target.warehouse.name}</p>
          </div>

          {/* Current qty display */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-1">Stok Saat Ini</p>
              {unitDisplays.length > 0 ? (
                <div className="space-y-0.5">
                  {unitDisplays.map((u) => (
                    <p key={u.name} className="font-semibold font-mono leading-tight">
                      {u.qty % 1 === 0
                        ? u.qty.toLocaleString("id-ID")
                        : u.qty.toLocaleString("id-ID", { maximumFractionDigits: 3 })}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{u.name}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="font-semibold font-mono">
                  {currentQty.toLocaleString("id-ID")}
                  {target.item.defaultUnit && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {target.item.defaultUnit.name}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="rounded-md border border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Selisih</p>
              <p className={`font-semibold font-mono ${diff === null ? "text-muted-foreground" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {diff === null ? "—" : diff > 0 ? `+${diff.toLocaleString("id-ID")}` : diff.toLocaleString("id-ID")}
                {diff !== null && diff !== 0 && target.item.defaultUnit && (
                  <span className="ml-1 text-xs font-normal opacity-70">
                    {target.item.defaultUnit.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Conversion notice */}
          {conversionLines.length > 0 && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 space-y-0.5">
              {conversionLines.map((line) => (
                <p key={line} className="text-xs text-blue-700 dark:text-blue-300 font-mono">{line}</p>
              ))}
            </div>
          )}

          {/* Qty aktual input */}
          <div className="space-y-1.5">
            <Label className="text-sm">Qty Aktual (hasil hitung fisik) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={0}
              step={0.001}
              value={qtyActual}
              onChange={(e) => setQty(e.target.value)}
              className="h-9 font-mono"
              placeholder="0"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-sm">Alasan <span className="text-destructive">*</span></Label>
            <SimpleSelect
              value={reason}
              onChange={setReason}
              options={ADJUSTMENT_REASONS.map((r): SelectOption => ({ value: r, label: r }))}
            />
          </div>

          {/* GL Account (Akun Penyesuaian) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Akun Penyesuaian <span className="text-destructive">*</span></Label>
              <button
                type="button"
                onClick={() => refetchGl2()}
                disabled={isRefetchingGl2}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Reload daftar akun dari database"
              >
                {isRefetchingGl2 ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Reload
              </button>
            </div>
            <SimpleSelect
              value={glAccountId}
              onChange={setGlAccount}
              placeholder="— Pilih akun penyesuaian —"
              searchable
              searchPlaceholder="Cari nama atau nomor akun..."
              options={glAccounts.map((a): SelectOption => ({
                value: a.id,
                label: a.number ? `[${a.number}] ${a.name}` : a.name,
              }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan..."
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={adjustMutation.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={adjustMutation.isPending}>
            {adjustMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Simpan Penyesuaian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
