import { useState } from "react";
import {
  ArrowDown, ArrowUp, Package, Search, Loader2, Check,
  SlidersHorizontal, RefreshCw, Trash2, AlertTriangle,
  TrendingDown, Plus, Edit2, X, Building2, Download,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
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
import {
  useInventories, useItemCategories, useStockMovements,
  useCreateStockAdjustment, useGlAccounts, useCreateBatchStockAdjustment,
  useLowStock, useUpdateMinStock, useCreateOpeningBalance, useItems,
} from "../hooks";
import { useWarehouses } from "@/features/settings/hooks";
import type { InventoryBalance, CreateOpeningBalanceInput, OpeningBalanceItemInput } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import type { SelectOption } from "@/components/ui/simple-select";

// ── CSV export helper ─────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ADJUSTMENT_REASONS = [
  "Selisih Stok",
  "Barang Rusak",
  "Barang Hilang",
  "Koreksi",
];

const TABS = [
  { key: "stock",      label: "Stok" },
  { key: "movements",  label: "Mutasi" },
  { key: "adjustment", label: "Penyesuaian" },
  { key: "low-stock",  label: "Stok Rendah" },
] as const;
type Tab = (typeof TABS)[number]["key"];

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

// ── Main page ─────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { branchId } = useAuthStore();
  const { user } = useAuthStore();
  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";
  const [activeTab, setActiveTab]     = useState<Tab>("stock");
  const [showOpeningBalance, setShowOpeningBalance] = useState(false);
  const [allBranches, setAllBranches] = useState(false);

  const effectiveBranchId = isSuperUser && allBranches ? undefined : (branchId ?? undefined);

  // Low stock count for badge — ikut effectiveBranchId agar sinkron dengan isi tab
  const { data: lowStockItems = [] } = useLowStock({ branchId: effectiveBranchId });

  return (
    <PageContainer
      title="Inventori"
      subtitle="Saldo stok dan mutasi barang"
      action={
        <div className="flex items-center gap-2">
          {isSuperUser && (
            <button
              onClick={() => setAllBranches((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                allBranches
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {allBranches ? "Semua Cabang" : "Cabang Ini"}
            </button>
          )}
          {isSuperUser && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowOpeningBalance(true)}>
              <Plus className="h-4 w-4" /> Saldo Awal
            </Button>
          )}
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="relative">
              {tab.label}
              {tab.key === "low-stock" && lowStockItems.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold w-4 h-4 leading-none">
                  {lowStockItems.length > 99 ? "99+" : lowStockItems.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="stock">
          <StockTab branchId={effectiveBranchId} showAllBranches={allBranches && isSuperUser} />
        </TabsContent>
        <TabsContent value="movements">
          <MovementsTab branchId={effectiveBranchId} showAllBranches={allBranches && isSuperUser} />
        </TabsContent>
        <TabsContent value="adjustment">
          <BatchAdjustmentTab branchId={branchId} />
        </TabsContent>
        <TabsContent value="low-stock">
          <LowStockTab branchId={effectiveBranchId} showAllBranches={allBranches && isSuperUser} />
        </TabsContent>

      </Tabs>

      {showOpeningBalance && (
        <OpeningBalanceDialog
          branchId={branchId}
          onClose={() => setShowOpeningBalance(false)}
        />
      )}
    </PageContainer>
  );
}

// ── Stock balance tab ─────────────────────────────────────────────────────────

function StockTab({ branchId, showAllBranches = false }: { branchId?: string; showAllBranches?: boolean }) {
  const { user } = useAuthStore();
  const isSuperUser     = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";
  const canAdjust       = isSuperUser || user?.roleCode === "MANAGER" || user?.roleCode === "INVENTORY" || user?.roleCode === "FINANCE";
  const canEditMinStock = isSuperUser || user?.roleCode === "MANAGER" || user?.roleCode === "INVENTORY";

  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedSub, setSelectedSub]     = useState("");
  const [adjustTarget, setAdjustTarget]   = useState<InventoryBalance | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [minStockValue, setMinStockValue]    = useState<string>("");
  const updateMinStockMut = useUpdateMinStock();

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

  function handleReset() {
    setSearch(""); setDebouncedSearch("");
    setSelectedParent(""); setSelectedSub("");
    setPage(1);
  }

  const { data, isLoading } = useInventories({
    page, limit: 30,
    branchId:         branchId ?? undefined,
    search:           debouncedSearch || undefined,
    parentCategoryId: selectedParent && !selectedSub ? selectedParent : undefined,
    categoryId:       selectedSub || undefined,
  });
  const inventories = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 30) : 1;
  const hasFilter   = !!(debouncedSearch || selectedParent || selectedSub);

  return (
    <>
    <Card>
      <CardHeader className="pb-3 pt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={handleSearch} placeholder="Cari barang..." className="pl-8 h-9" />
          </div>

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

          {inventories.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs ml-auto"
              onClick={() => {
                const header = ["Nama Barang", "Kode", "Kategori", showAllBranches ? "Cabang" : null, "Gudang", "Di Tangan", "Tersedia", "Min Stok", "Satuan"].filter(Boolean);
                const rows = inventories.map((inv) => [
                  inv.item.name,
                  inv.item.itemCode ?? "",
                  inv.item.category?.name ?? "",
                  ...(showAllBranches ? [inv.warehouse.branch?.name ?? ""] : []),
                  inv.warehouse.name,
                  Number(inv.qtyOnHand),
                  Number(Number(inv.qtyOnHand) - Number(inv.qtyReserved ?? 0)),
                  inv.minStock != null ? Number(inv.minStock) : "",
                  inv.item.defaultUnit?.name ?? "",
                ]);
                downloadCSV(`stok_${new Date().toISOString().slice(0, 10)}.csv`, [header as string[], ...rows]);
              }}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
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
                    {showAllBranches && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Di Tangan</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tersedia</th>
                    {canEditMinStock && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Min Stok</th>}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Update Terakhir</th>
                    {canAdjust && <th className="px-4 py-3 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {inventories.map((inv) => {
                    const onHand   = Number(inv.qtyOnHand);
                    const available = Number(inv.qtyAvailable);
                    const minStock  = inv.minStock != null ? Number(inv.minStock) : null;
                    const isLow     = minStock !== null && onHand < minStock;
                    const isEditing = editingMinStock === inv.id;
                    return (
                      <tr key={inv.id} className={`border-b border-border transition-colors hover:bg-muted/30 ${isLow ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" title="Stok di bawah minimum" />}
                            <div>
                              <p className="font-medium">{inv.item.name}</p>
                              {inv.item.itemCode && <p className="text-xs text-muted-foreground">{inv.item.itemCode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inv.item.category?.name ?? "—"}</td>
                        {showAllBranches && (
                          <td className="px-4 py-3 text-xs">
                            {inv.warehouse.branch
                              ? <span className="font-medium">{inv.warehouse.branch.name}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3 text-muted-foreground">{inv.warehouse.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{onHand.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${available < 0 ? "text-red-600" : "text-foreground"}`}>
                            {available.toLocaleString("id-ID")}
                          </span>
                        </td>
                        {canEditMinStock && (
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={minStockValue}
                                  onChange={(e) => setMinStockValue(e.target.value)}
                                  className="h-7 w-20 text-right font-mono text-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const val = minStockValue === "" ? null : parseFloat(minStockValue);
                                      updateMinStockMut.mutate(
                                        { inventoryId: inv.id, minStock: val },
                                        { onSuccess: () => setEditingMinStock(null) },
                                      );
                                    }
                                    if (e.key === "Escape") setEditingMinStock(null);
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const val = minStockValue === "" ? null : parseFloat(minStockValue);
                                    updateMinStockMut.mutate(
                                      { inventoryId: inv.id, minStock: val },
                                      { onSuccess: () => setEditingMinStock(null) },
                                    );
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setEditingMinStock(null)} className="text-muted-foreground hover:text-foreground">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className={`font-mono text-sm hover:underline ${isLow ? "text-red-600 font-bold" : "text-muted-foreground"}`}
                                onClick={() => { setEditingMinStock(inv.id); setMinStockValue(minStock !== null ? String(minStock) : ""); }}
                                title="Klik untuk ubah min stok"
                              >
                                {minStock !== null ? minStock.toLocaleString("id-ID") : <Edit2 className="h-3 w-3 inline opacity-40" />}
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.updatedAt)}</td>
                        {canAdjust && (
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
                      {canAdjust && (
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

function MovementsTab({ branchId, showAllBranches = false }: { branchId?: string; showAllBranches?: boolean }) {
  const [page, setPage]       = useState(1);
  const [type, setType]       = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");

  // M2: item search filter
  const [itemSearch, setItemSearch]       = useState("");
  const [dItemSearch, setDItemSearch]     = useState("");
  const [showItemDrop, setShowItemDrop]   = useState(false);
  const [selectedItemId, setSelectedItemId]     = useState<string | undefined>(undefined);
  const [selectedItemName, setSelectedItemName] = useState("");

  // M2: warehouse filter
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(undefined);

  const { data: itemDropData } = useItems({
    search: dItemSearch || undefined,
    itemType: "INVENTORY",
    limit: 15,
  });
  const itemDropResults = itemDropData ?? [];

  const { data: warehouseDropData } = useWarehouses({ branchId: branchId ?? undefined, limit: 100 });
  const warehouseOptions: SelectOption[] = [
    { value: "", label: "Semua Gudang" },
    ...(warehouseDropData?.data ?? []).map((w) => ({ value: w.id, label: w.name })),
  ];

  function handleItemSearch(val: string) {
    setItemSearch(val);
    clearTimeout((handleItemSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleItemSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setDItemSearch(val), 300);
    setShowItemDrop(val.length >= 1);
    // jika user edit manual, clear pilihan sebelumnya
    if (selectedItemId) { setSelectedItemId(undefined); setSelectedItemName(""); }
  }

  function selectItem(id: string, name: string) {
    setSelectedItemId(id);
    setSelectedItemName(name);
    setItemSearch("");
    setDItemSearch("");
    setShowItemDrop(false);
    setPage(1);
  }

  function clearItem() {
    setSelectedItemId(undefined);
    setSelectedItemName("");
    setItemSearch("");
    setDItemSearch("");
    setPage(1);
  }

  const hasFilter = type || startDate || endDate || selectedItemId || selectedWarehouseId;

  function resetAllFilters() {
    setType("");
    setStart("");
    setEnd("");
    clearItem();
    setSelectedWarehouseId(undefined);
    setPage(1);
  }

  const { data, isLoading } = useStockMovements({
    page, limit: 30,
    direction:   (type as "IN" | "OUT" | "") || undefined,
    branchId:    branchId ?? undefined,
    startDate:   startDate || undefined,
    endDate:     endDate || undefined,
    itemId:      selectedItemId,
    warehouseId: selectedWarehouseId,
  });

  const movements  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 30) : 1;

  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        {/* Direction tabs */}
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

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Item search */}
          <div className="flex flex-col gap-1 relative">
            <Label className="text-xs text-muted-foreground">Cari Barang</Label>
            {selectedItemId ? (
              <div className="h-9 flex items-center gap-1.5 px-2.5 rounded-md border border-border bg-muted/40 text-sm max-w-[220px]">
                <span className="truncate flex-1 font-medium text-foreground">{selectedItemName}</span>
                <button onClick={clearItem} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={itemSearch}
                  onChange={(e) => handleItemSearch(e.target.value)}
                  onFocus={() => { if (itemSearch.length >= 1) setShowItemDrop(true); }}
                  onBlur={() => setTimeout(() => setShowItemDrop(false), 150)}
                  placeholder="Nama barang..."
                  className="h-9 pl-8 w-[180px]"
                />
                {showItemDrop && itemDropResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-border bg-popover shadow-md max-h-52 overflow-y-auto">
                    {itemDropResults.map((item) => (
                      <button
                        key={item.id}
                        onMouseDown={() => selectItem(item.id, item.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex flex-col"
                      >
                        <span className="font-medium">{item.name}</span>
                        {item.itemCode && <span className="text-xs text-muted-foreground">{item.itemCode}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warehouse selector */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Gudang</Label>
            <SimpleSelect
              options={warehouseOptions}
              value={selectedWarehouseId ?? ""}
              onChange={(val) => { setSelectedWarehouseId(val || undefined); setPage(1); }}
              className="h-9 w-[160px]"
            />
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Dari</Label>
            <Input type="date" value={startDate} onChange={(e) => { setStart(e.target.value); setPage(1); }} className="h-9 w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sampai</Label>
            <Input type="date" value={endDate} onChange={(e) => { setEnd(e.target.value); setPage(1); }} className="h-9 w-36" />
          </div>

          {/* Reset all */}
          {hasFilter && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={resetAllFilters} className="h-9 text-xs gap-1">
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          )}

          {/* M5 — Export CSV */}
          {movements.length > 0 && (
            <div className="flex items-end ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => {
                  const header = [
                    "Barang", "Kode", ...(showAllBranches ? ["Cabang"] : []), "Gudang",
                    "Tipe", "Qty", "Saldo Sebelum", "Saldo Sesudah",
                    "Referensi", "Dibuat Oleh", "Tanggal",
                  ];
                  const rows = movements.map((m) => [
                    m.inventory.item.name,
                    m.inventory.item.itemCode ?? "",
                    ...(showAllBranches ? [m.inventory.warehouse.branch?.name ?? ""] : []),
                    m.inventory.warehouse.name,
                    MOVEMENT_LABEL[m.movementType] ?? m.movementType,
                    Math.abs(Number(m.qtyChange)),
                    Number(m.qtyBefore),
                    Number(m.qtyAfter),
                    m.referenceNo ?? (m.referenceType && m.referenceId ? `${m.referenceType} ${m.referenceId.slice(-8).toUpperCase()}` : ""),
                    m.createdByEmployee?.name ?? "",
                    m.createdAt,
                  ]);
                  downloadCSV(`mutasi_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
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
                    {showAllBranches && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo Sebelum</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo Sesudah</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referensi</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dibuat Oleh</th>
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
                      {showAllBranches && (
                        <td className="px-4 py-3 text-xs">
                          {m.inventory.warehouse.branch
                            ? <span className="font-medium">{m.inventory.warehouse.branch.name}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-muted-foreground">{m.inventory.warehouse.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs gap-1 ${isIn ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                          {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{Math.abs(Number(m.qtyChange)).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.qtyBefore).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.qtyAfter).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        {(m.referenceType || m.referenceNo) && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {m.referenceNo ?? `${m.referenceType} ...${m.referenceId?.slice(-8).toUpperCase()}`}
                          </span>
                        )}
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.createdByEmployee?.name ?? <span className="text-muted-foreground/50 italic">—</span>}
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
                        {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(Number(m.qtyChange)).toLocaleString("id-ID")}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">
                      {m.referenceNo ?? (m.referenceType && m.referenceId ? `${m.referenceType} ...${m.referenceId.slice(-8).toUpperCase()}` : "—")}
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

// ── Batch Adjustment Tab ──────────────────────────────────────────────────────

interface AdjustLine {
  inventoryId:   string;
  itemName:      string;
  itemCode:      string | null;
  warehouseName: string;
  qtyOnHand:     number;
  defaultUnit:   string | null;
  qtyActual:     string;
}

function BatchAdjustmentTab({ branchId }: { branchId?: string | null }) {
  const { user } = useAuthStore();
  const isSuperUser = user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "OWNER";
  // Sesuai ADJUST_ROLES di backend: SUPER_ADMIN, OWNER, MANAGER, INVENTORY, FINANCE
  const canAdjust   = isSuperUser
    || user?.roleCode === "MANAGER"
    || user?.roleCode === "INVENTORY"
    || user?.roleCode === "FINANCE";

  const [glAccountId, setGlAccount] = useState("");
  const [reason, setReason]         = useState(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes]           = useState("");
  const [lines, setLines]           = useState<AdjustLine[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const [search, setSearch]     = useState("");
  const [dSearch, setDSearch]   = useState("");
  const [showDrop, setShowDrop] = useState(false);

  const { data: glAccounts = [], refetch: refetchGl, isFetching: isRefetchingGl } = useGlAccounts({ usage: "STOCK_ADJUSTMENT" });
  const batchMutation = useCreateBatchStockAdjustment();

  const { data: searchData } = useInventories({
    search:   dSearch || undefined,
    branchId: branchId ?? undefined,
    limit:    20,
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
        inventoryId:   inv.id,
        itemName:      inv.item.name,
        itemCode:      inv.item.itemCode,
        warehouseName: inv.warehouse.name,
        qtyOnHand:     Number(inv.qtyOnHand),
        defaultUnit:   inv.item.defaultUnit?.name ?? null,
        qtyActual:     String(Number(inv.qtyOnHand)),
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
    if (!glAccountId)       return toast.error("Pilih akun penyesuaian");
    if (!reason)            return toast.error("Pilih alasan penyesuaian");
    if (lines.length === 0) return toast.error("Tambahkan minimal 1 item");

    const invalidLine = lines.find((l) => l.qtyActual === "" || isNaN(parseFloat(l.qtyActual)) || parseFloat(l.qtyActual) < 0);
    if (invalidLine) return toast.error(`Qty aktual tidak valid untuk: ${invalidLine.itemName}`);

    // Validasi lulus — buka dialog konfirmasi (M4)
    setShowConfirm(true);
  }

  function handleConfirmSubmit() {
    setShowConfirm(false);
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

  if (!canAdjust) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Anda tidak memiliki akses untuk melakukan penyesuaian stok.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div>
            <h2 className="text-sm font-semibold">Penyesuaian Persediaan</h2>
            <p className="text-xs text-muted-foreground">Sesuaikan stok banyak barang sekaligus — hasil akan disinkronkan ke Accurate</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="space-y-1.5">
              <Label className="text-sm">Alasan <span className="text-destructive">*</span></Label>
              <SimpleSelect
                value={reason}
                onChange={setReason}
                options={ADJUSTMENT_REASONS.map((r): SelectOption => ({ value: r, label: r }))}
              />
            </div>

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

      {/* M4 — Konfirmasi sebelum simpan penyesuaian */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Penyesuaian Stok
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="text-sm text-muted-foreground">
              Anda akan menyesuaikan stok <strong className="text-foreground">{lines.length} item</strong>
              {" "}dengan alasan <strong className="text-foreground">{reason}</strong>.
              Tindakan ini akan dicatat dan disinkronkan ke Accurate.
            </div>

            {/* Ringkasan selisih */}
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sistem</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Aktual</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const actual = parseFloat(line.qtyActual);
                    const diff   = isNaN(actual) ? null : actual - line.qtyOnHand;
                    return (
                      <tr key={line.inventoryId} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium">{line.itemName}</p>
                          <p className="text-muted-foreground">{line.warehouseName}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{line.qtyOnHand.toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2 text-right font-mono">{isNaN(actual) ? "—" : actual.toLocaleString("id-ID")}</td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${diff === null ? "" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {diff === null ? "—" : diff > 0 ? `+${diff.toLocaleString("id-ID")}` : diff.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {notes && (
              <p className="text-xs text-muted-foreground italic">Catatan: {notes}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Batal</Button>
            <Button onClick={handleConfirmSubmit} disabled={batchMutation.isPending} className="gap-1.5">
              {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Simpan Penyesuaian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── GAP 3: Low Stock Tab ──────────────────────────────────────────────────────

function LowStockTab({ branchId, showAllBranches = false }: { branchId?: string; showAllBranches?: boolean }) {
  const { data: items = [], isLoading, refetch } = useLowStock({ branchId: branchId ?? undefined });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingDown className="h-4 w-4 text-red-500" />
          {items.length > 0
            ? <span><strong className="text-red-600">{items.length}</strong> item di bawah stok minimum</span>
            : <span className="text-green-600 font-medium">Semua stok dalam batas normal</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<TrendingDown className="h-6 w-6 text-green-500" />}
              title="Stok aman"
              description="Tidak ada item yang di bawah stok minimum"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategori</th>
                    {showAllBranches && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stok Saat Ini</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Min Stok</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const onHand  = Number(item.qtyOnHand);
                    const minStock = Number(item.minStock);
                    const diff    = onHand - minStock;
                    return (
                      <tr key={item.id} className="border-b border-border bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <div>
                              <p className="font-medium">{item.item.name}</p>
                              {item.item.itemCode && <p className="text-xs text-muted-foreground font-mono">{item.item.itemCode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.item.category?.name ?? "—"}</td>
                        {showAllBranches && (
                          <td className="px-4 py-3 text-xs">
                            {item.warehouse.branch
                              ? <span className="font-medium">{item.warehouse.branch.name}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3 text-muted-foreground">{item.warehouse.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">{onHand.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono">{minStock.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{diff.toLocaleString("id-ID")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── GAP 2: Opening Balance Dialog ─────────────────────────────────────────────

function OpeningBalanceDialog({ branchId, onClose }: { branchId?: string | null; onClose: () => void }) {
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes]             = useState("");
  const [lines, setLines]             = useState<Array<{ itemId: string; itemName: string; itemCode: string | null; qty: string; unitCost: string }>>([]);
  const [itemSearch, setItemSearch]   = useState("");
  const [dItemSearch, setDItemSearch] = useState("");
  const [showDrop, setShowDrop]       = useState(false);

  const createMut = useCreateOpeningBalance();
  const { data: warehouseData } = useWarehouses({ branchId: branchId ?? undefined, limit: 100 });
  const warehouses = warehouseData?.data ?? [];

  // Gunakan item master (bukan inventory records) agar item baru tanpa stok pun bisa ditemukan
  const { data: itemMasterData } = useItems({ search: dItemSearch || undefined, itemType: "INVENTORY", limit: 20 });
  const searchResults = (itemMasterData ?? []).filter(
    (item) => !lines.find((l) => l.itemId === item.id)
  );

  function handleItemSearch(val: string) {
    setItemSearch(val);
    clearTimeout((handleItemSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleItemSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setDItemSearch(val), 300);
    setShowDrop(val.length >= 1);
  }

  function selectItem(item: { id: string; name: string; itemCode: string | null }) {
    setLines((prev) => [...prev, { itemId: item.id, itemName: item.name, itemCode: item.itemCode, qty: "0", unitCost: "" }]);
    setItemSearch(""); setDItemSearch(""); setShowDrop(false);
  }

  function updateLine(itemId: string, field: "qty" | "unitCost", val: string) {
    setLines((prev) => prev.map((l) => l.itemId === itemId ? { ...l, [field]: val } : l));
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function handleSubmit() {
    if (!warehouseId)       return toast.error("Pilih gudang");
    if (lines.length === 0) return toast.error("Tambahkan minimal 1 item");
    const invalid = lines.find((l) => l.qty === "" || isNaN(parseFloat(l.qty)) || parseFloat(l.qty) < 0);
    if (invalid) return toast.error(`Qty tidak valid untuk: ${invalid.itemName}`);

    const items: OpeningBalanceItemInput[] = lines.map((l) => ({
      itemId:   l.itemId,
      qty:      parseFloat(l.qty),
      unitCost: l.unitCost !== "" ? parseFloat(l.unitCost) : null,
    }));

    createMut.mutate(
      { warehouseId, notes: notes || null, items } as CreateOpeningBalanceInput,
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Input Saldo Awal Inventori
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Gudang <span className="text-destructive">*</span></Label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Pilih Gudang —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keterangan..." className="h-9" />
            </div>
          </div>

          {/* Item search */}
          <div className="space-y-1.5">
            <Label className="text-sm">Tambah Barang</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={itemSearch}
                onChange={(e) => handleItemSearch(e.target.value)}
                onFocus={() => { if (itemSearch.length >= 1) setShowDrop(true); }}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                placeholder="Cari barang..."
                className="pl-8 h-9"
              />
              {showDrop && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 border border-border rounded-md bg-popover shadow-md overflow-hidden">
                  {searchResults.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => selectItem(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0"
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.itemCode && <span className="ml-2 text-xs text-muted-foreground font-mono">{item.itemCode}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Barang</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-36">Harga Pokok</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.itemId} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <p className="font-medium">{line.itemName}</p>
                        {line.itemCode && <p className="text-xs text-muted-foreground font-mono">{line.itemCode}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.001}
                          value={line.qty}
                          onChange={(e) => updateLine(line.itemId, "qty", e.target.value)}
                          className="h-7 text-right font-mono text-xs w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={line.unitCost}
                          onChange={(e) => updateLine(line.itemId, "unitCost", e.target.value)}
                          placeholder="0"
                          className="h-7 text-right font-mono text-xs w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeLine(line.itemId)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || lines.length === 0}>
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Simpan Saldo Awal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Adjust Stock Dialog ────────────────────────────────────────────────────────

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

  const sortedUnits = target.item.itemUnits
    .filter((u) => Number(u.conversionFactor) > 0)
    .slice()
    .sort((a, b) => Number(a.conversionFactor) - Number(b.conversionFactor));

  const baseUnit = sortedUnits[0];

  const unitDisplays = sortedUnits.map((u) => ({
    name: u.unit.name,
    qty:  currentQty / Number(u.conversionFactor),
  })).filter((u) => !isNaN(u.qty));

  const conversionLines = sortedUnits.slice(1).map((u) => {
    const ratio = Number(u.conversionFactor) / Number(baseUnit?.conversionFactor ?? 1);
    return `1 ${u.unit.name} = ${ratio % 1 === 0 ? ratio.toLocaleString("id-ID") : ratio.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ${baseUnit?.unit.name ?? ""}`;
  });

  function handleSubmit() {
    if (qtyActual === "" || isNaN(parsed) || parsed < 0) { toast.error("Qty aktual tidak valid"); return; }
    if (!reason)      { toast.error("Alasan wajib dipilih"); return; }
    if (!glAccountId) { toast.error("Akun penyesuaian wajib dipilih"); return; }
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
          <div className="rounded-md bg-muted/50 px-4 py-3 space-y-0.5">
            <p className="font-medium text-sm">{target.item.name}</p>
            {target.item.itemCode && (
              <p className="text-xs text-muted-foreground font-mono">{target.item.itemCode}</p>
            )}
            <p className="text-xs text-muted-foreground">{target.warehouse.name}</p>
          </div>

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

          {conversionLines.length > 0 && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 space-y-0.5">
              {conversionLines.map((line) => (
                <p key={line} className="text-xs text-blue-700 dark:text-blue-300 font-mono">{line}</p>
              ))}
            </div>
          )}

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

          <div className="space-y-1.5">
            <Label className="text-sm">Alasan <span className="text-destructive">*</span></Label>
            <SimpleSelect
              value={reason}
              onChange={setReason}
              options={ADJUSTMENT_REASONS.map((r): SelectOption => ({ value: r, label: r }))}
            />
          </div>

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
