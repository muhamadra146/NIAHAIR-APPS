'use client';
import { useState } from "react";
import {
  Archive, Lock, Unlock, ChevronDown, AlertTriangle, Loader2,
  Plus, ClipboardList, Eye, Send, XCircle, Check, RefreshCw, Link2, Trash2, Search, Filter,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { useAuthStore } from "@/stores/authStore";
import {
  useInventoryPeriods, useClosePeriod, useReopenPeriod,
  useStockOpnames, useStockOpname, useCreateStockOpname,
  useUpdateOpnameItems, usePostStockOpname, useCancelStockOpname,
  useDeleteStockOpname, useSyncStockOpnameToAccurate,
} from "../hooks";
import { useWarehouses } from "@/features/settings/hooks";
import type { InventoryPeriod, StockOpname, StockOpnameStatus, UpdateOpnameItemInput } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function monthLabel(year: number, month: number) {
  return `${MONTHS_ID[month - 1]} ${year}`;
}

function lastNMonths(n: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

const OPNAME_STATUS_LABEL: Record<StockOpnameStatus, string> = {
  DRAFT:       "Draft",
  IN_PROGRESS: "Dalam Proses",
  POSTED:      "Telah Diposting",
  CANCELLED:   "Dibatalkan",
};

const OPNAME_STATUS_VARIANT: Record<StockOpnameStatus, string> = {
  DRAFT:       "bg-muted text-muted-foreground border-muted",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  POSTED:      "bg-green-100 text-green-700 border-green-200",
  CANCELLED:   "bg-red-100 text-red-600 border-red-200",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_TABS = [
  { key: "opname",   label: "Opname Fisik" },
  { key: "periode",  label: "Periode Inventori" },
] as const;
type PageTab = (typeof PAGE_TABS)[number]["key"];

export function StockOpnamePage() {
  const { user } = useAuthStore();
  const isAdmin  = ["SUPER_ADMIN","OWNER"].includes(user?.roleCode ?? "");
  const [activeTab, setActiveTab] = useState<PageTab>("opname");

  return (
    <PageContainer
      title="Stock Opname"
      subtitle="Opname fisik stok dan kelola periode inventori"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PageTab)}>
        <TabsList>
          <TabsTrigger value="opname">Opname Fisik</TabsTrigger>
          {/* Tab Periode hanya untuk SUPER_ADMIN dan OWNER */}
          {isAdmin && <TabsTrigger value="periode">Periode Inventori</TabsTrigger>}
        </TabsList>
        <TabsContent value="opname"><OpnameTab /></TabsContent>
        {isAdmin && <TabsContent value="periode"><PeriodeTab /></TabsContent>}
      </Tabs>
    </PageContainer>
  );
}

// ── Opname Fisik Tab ──────────────────────────────────────────────────────────

function OpnameTab() {
  const { branchId, user } = useAuthStore();
  // Hanya MANAGEMENT yang bisa buat, posting, cancel opname
  const canManage = ["SUPER_ADMIN","OWNER","MANAGER"].includes(user?.roleCode ?? "");
  const [page, setPage]           = useState(1);
  const [filterStatus, setFilter] = useState<StockOpnameStatus | "">("");
  const [showCreate, setShowCreate]       = useState(false);
  const [detailId, setDetailId]           = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteMutList = useDeleteStockOpname();

  const { data, isLoading, refetch } = useStockOpnames({
    page, limit: 20,
    status: filterStatus || undefined,
  });

  const opnames    = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  const STATUS_FILTERS: Array<{ key: StockOpnameStatus | ""; label: string }> = [
    { key: "",            label: "Semua" },
    { key: "DRAFT",       label: "Draft" },
    { key: "IN_PROGRESS", label: "Dalam Proses" },
    { key: "POSTED",      label: "Diposting" },
    { key: "CANCELLED",   label: "Dibatalkan" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Buat Opname
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : opnames.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="Belum ada opname"
              description="Buat opname baru untuk mulai hitung fisik stok"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Opname</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gudang</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Item</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dibuat</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Diposting</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accurate</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {opnames.map((opname) => (
                    <tr key={opname.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-medium">{opname.opnameNo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{opname.warehouse.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${OPNAME_STATUS_VARIANT[opname.status]}`}>
                          {OPNAME_STATUS_LABEL[opname.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{opname._count?.items ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {opname.createdBy?.name ?? "—"}
                        <br />
                        <span className="text-xs">{new Date(opname.createdAt).toLocaleDateString("id-ID")}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {opname.postedAt
                          ? new Date(opname.postedAt).toLocaleDateString("id-ID")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {opname.status === "POSTED" ? (
                          opname.accurateResultId ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                              <Link2 className="h-3 w-3" /> Tersinkron
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                              Belum Sync
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setDetailId(opname.id)}
                            title="Lihat detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {opname.status === "CANCELLED" && canManage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDeleteId(opname.id)}
                              title="Hapus opname"
                              disabled={deleteMutList.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <Pagination page={page} limit={20} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showCreate && (
        <CreateOpnameDialog
          branchId={branchId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {detailId && (
        <OpnameDetailDialog
          opnameId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Confirm Delete */}
      {confirmDeleteId && (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Hapus Opname
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm py-2">
              Yakin ingin menghapus opname ini? Data akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deleteMutList.isPending}>Batal</Button>
              <Button variant="destructive" size="sm"
                disabled={deleteMutList.isPending}
                onClick={() => {
                  deleteMutList.mutate(confirmDeleteId, {
                    onSuccess: () => setConfirmDeleteId(null),
                  });
                }}
              >
                {deleteMutList.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Create Opname Dialog ──────────────────────────────────────────────────────

function CreateOpnameDialog({ branchId, onClose }: { branchId?: string | null; onClose: () => void }) {
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes]             = useState("");

  const { data: warehouseData } = useWarehouses({ branchId: branchId ?? undefined, limit: 100 });
  const warehouses = warehouseData?.data ?? [];

  const createMut = useCreateStockOpname();

  function handleSubmit() {
    if (!warehouseId) return;
    createMut.mutate(
      { warehouseId, notes: notes || null },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Opname Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
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
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keterangan opname..." className="h-9" />
          </div>
          <p className="text-xs text-muted-foreground">
            Sistem akan men-snapshot qty saat ini untuk semua item INVENTORY di gudang ini.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={!warehouseId || createMut.isPending}>
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Buat Opname
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Opname Detail Dialog ──────────────────────────────────────────────────────

function OpnameDetailDialog({ opnameId, onClose }: { opnameId: string; onClose: () => void }) {
  const { user } = useAuthStore();
  // Hanya MANAGEMENT yang bisa posting/cancel; INVENTORY hanya bisa input qty
  const canManage = ["SUPER_ADMIN","OWNER","MANAGER"].includes(user?.roleCode ?? "");
  const { data: opname, isLoading } = useStockOpname(opnameId);
  const [editedItems, setEditedItems] = useState<Record<string, { qtyActual: string; notes: string }>>({});
  const [showConfirmPost, setShowConfirmPost]     = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [filterCategory, setFilterCategory]       = useState<string>("");
  const [searchItem, setSearchItem]               = useState<string>("");

  const updateMut  = useUpdateOpnameItems(opnameId);
  const postMut    = usePostStockOpname();
  const cancelMut  = useCancelStockOpname();
  const deleteMut  = useDeleteStockOpname();
  const syncMut    = useSyncStockOpnameToAccurate();

  function setItemEdit(id: string, field: "qtyActual" | "notes", val: string) {
    setEditedItems((prev) => ({
      ...prev,
      [id]: { qtyActual: prev[id]?.qtyActual ?? "", notes: prev[id]?.notes ?? "", [field]: val },
    }));
  }

  function initEdit(item: NonNullable<typeof opname>["items"][0]) {
    if (!editedItems[item.id]) {
      setEditedItems((prev) => ({
        ...prev,
        [item.id]: {
          qtyActual: item.qtyActual != null ? String(Number(item.qtyActual)) : "",
          notes:     item.notes ?? "",
        },
      }));
    }
  }

  function handleSaveItems() {
    if (!opname) return;
    // Hanya kirim item yang benar-benar diedit pada sesi ini.
    // Mengirim semua item (termasuk yang tidak diedit) akan me-reset qtyActual
    // yang sudah tersimpan di DB menjadi null untuk item yang tidak ada di editedItems.
    const items: UpdateOpnameItemInput[] = Object.entries(editedItems).map(([id, edited]) => ({
      id,
      qtyActual: edited.qtyActual !== "" && edited.qtyActual != null
        ? parseFloat(edited.qtyActual)
        : null,
      notes: edited.notes || null,
    }));
    if (items.length === 0) return;
    updateMut.mutate(items, {
      onSuccess: () => setEditedItems({}),  // reset dirty state setelah berhasil simpan
    });
  }

  const isDirty   = Object.keys(editedItems).length > 0;
  const isActive  = opname?.status === "DRAFT" || opname?.status === "IN_PROGRESS";
  const canEdit   = isActive;
  const canPost   = isActive && canManage;   // hanya MANAGEMENT yang bisa posting
  const canCancel = isActive && canManage;   // hanya MANAGEMENT yang bisa cancel

  // ── Derive kategori unik dari items ─────────────────────────────────────────
  const allCategories = opname
    ? Array.from(
        new Map(
          opname.items
            ?.filter((it) => it.inventory.item.category)
            .map((it) => [it.inventory.item.category!.id, it.inventory.item.category!]) ?? []
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // ── Filter items berdasarkan kategori dan search ──────────────────────────
  const filteredItems = (opname?.items ?? []).filter((item) => {
    const matchCat    = !filterCategory || item.inventory.item.category?.id === filterCategory;
    const needle      = searchItem.toLowerCase();
    const matchSearch = !needle
      || item.inventory.item.name.toLowerCase().includes(needle)
      || (item.inventory.item.itemCode ?? "").toLowerCase().includes(needle);
    return matchCat && matchSearch;
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isLoading ? "Memuat..." : opname?.opnameNo}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !opname ? (
          <p className="text-sm text-muted-foreground py-4">Gagal memuat detail opname</p>
        ) : (
          <>
            {/* Info row */}
            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-muted-foreground border-b border-border pb-3">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide">Gudang</span>
                <p className="text-foreground font-medium text-sm">{opname.warehouse.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide">Status</span>
                <p>
                  <Badge variant="outline" className={`text-xs ${OPNAME_STATUS_VARIANT[opname.status]}`}>
                    {OPNAME_STATUS_LABEL[opname.status]}
                  </Badge>
                </p>
              </div>
              {opname.notes && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide">Catatan</span>
                  <p className="text-sm">{opname.notes}</p>
                </div>
              )}
              {opname.status === "POSTED" && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide">Accurate</span>
                  <p>
                    {opname.accurateResultId ? (
                      <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Tersinkron · {opname.accurateOrderNumber ?? "—"} / {opname.accurateResultNumber ?? "—"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum disinkronkan</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Filter bar — search + dropdown kategori */}
            <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border">
              {/* Search */}
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Cari barang..."
                  className="w-full pl-8 pr-3 h-8 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {/* Dropdown kategori + counter dalam satu baris */}
              <div className="flex items-center gap-2">
                {allCategories.length > 0 && (
                  <div className="relative">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={`pl-8 pr-7 h-8 rounded-md border text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none cursor-pointer w-[150px] ${
                        filterCategory
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-input bg-background text-muted-foreground"
                      }`}
                    >
                      <option value="">Semua Kategori</option>
                      {allCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {filteredItems.length}/{opname.items?.length ?? 0}
                </span>
              </div>
            </div>

            {/* Items table — max ~10 baris visible, scroll internal */}
            <div className="overflow-y-auto max-h-[300px] sm:max-h-[420px] rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Barang</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Qty Sistem</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-28">Qty Aktual</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Selisih</th>
                    {canEdit && <th className="hidden sm:table-cell px-3 py-2 text-left font-medium text-muted-foreground text-xs">Catatan</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 5 : 4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        {searchItem || filterCategory ? "Tidak ada item yang cocok dengan filter" : "Tidak ada item"}
                      </td>
                    </tr>
                  ) : null}
                  {filteredItems.map((item) => {
                    const edited    = editedItems[item.id];
                    const qtySystem = Number(item.qtySystem);
                    const qtyActualRaw = edited?.qtyActual ?? (item.qtyActual != null ? String(Number(item.qtyActual)) : "");
                    const qtyActual = qtyActualRaw !== "" ? parseFloat(qtyActualRaw) : null;
                    const diff      = qtyActual !== null ? qtyActual - qtySystem : item.qtyDifference != null ? Number(item.qtyDifference) : null;

                    return (
                      <tr key={item.id} className={`border-b border-border hover:bg-muted/10 transition-colors ${diff !== null && diff !== 0 ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm">{item.inventory.item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.inventory.item.itemCode && (
                              <span className="text-xs text-muted-foreground font-mono">{item.inventory.item.itemCode}</span>
                            )}
                            {item.inventory.item.category && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                                {item.inventory.item.category.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          {qtySystem.toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-2">
                          {canEdit ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.001}
                              value={qtyActualRaw}
                              onChange={(e) => { initEdit(item); setItemEdit(item.id, "qtyActual", e.target.value); }}
                              className="h-7 text-right font-mono text-xs w-28 ml-auto"
                              placeholder="—"
                            />
                          ) : (
                            <span className="block text-right font-mono">
                              {item.qtyActual != null ? Number(item.qtyActual).toLocaleString("id-ID") : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-sm">
                          <span className={diff === null ? "text-muted-foreground" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}>
                            {diff === null
                              ? "—"
                              : diff > 0 ? `+${diff.toLocaleString("id-ID")}`
                              : diff.toLocaleString("id-ID")}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="hidden sm:table-cell px-3 py-2">
                            <Input
                              value={edited?.notes ?? item.notes ?? ""}
                              onChange={(e) => { initEdit(item); setItemEdit(item.id, "notes", e.target.value); }}
                              placeholder="Catatan..."
                              className="h-7 text-xs"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="border-t border-border pt-3 flex flex-wrap gap-2 items-center justify-start sm:justify-end">
          {opname && (
            <>
              {canEdit && (
                <Button
                  size="sm"
                  variant={isDirty ? "default" : "outline"}
                  onClick={handleSaveItems}
                  disabled={!isDirty || updateMut.isPending}
                  className="gap-1.5"
                  title={isDirty ? "Simpan perubahan qty aktual" : "Belum ada perubahan"}
                >
                  {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Simpan
                  {isDirty && (
                    <span className="ml-1 bg-primary-foreground/20 rounded-full px-1.5 text-xs">
                      {Object.keys(editedItems).length}
                    </span>
                  )}
                </Button>
              )}

              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() => setShowConfirmCancel(true)}
                  disabled={cancelMut.isPending}
                >
                  <XCircle className="h-3.5 w-3.5" /> Batalkan
                </Button>
              )}

              {canPost && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowConfirmPost(true)}
                  disabled={postMut.isPending}
                >
                  <Send className="h-3.5 w-3.5" /> Posting Opname
                </Button>
              )}

              {/* Tombol Sync ke Accurate — hanya saat POSTED dan user adalah MANAGEMENT */}
              {opname.status === "POSTED" && canManage && (
                <Button
                  size="sm"
                  variant={opname.accurateResultId ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={() => syncMut.mutate(opname.id)}
                  disabled={syncMut.isPending}
                  title={opname.accurateResultId ? "Sudah tersinkron — klik untuk sync ulang" : "Sinkronkan ke Accurate Online"}
                >
                  {syncMut.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Link2 className="h-3.5 w-3.5" />}
                  {opname.accurateResultId ? "Sync Ulang" : "Sync ke Accurate"}
                </Button>
              )}
            </>
          )}
          {opname?.status === "CANCELLED" && canManage && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => deleteMut.mutate(opname.id, { onSuccess: () => onClose() })}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Hapus
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="ml-auto">Tutup</Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirm Post */}
      {showConfirmPost && opname && (
        <Dialog open onOpenChange={(o) => { if (!o) setShowConfirmPost(false); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Posting Opname
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm py-2">
              Memposting <strong>{opname.opnameNo}</strong> akan men-generate ADJUSTMENT movement untuk semua item dengan
              selisih. Item dengan qty aktual kosong dianggap sama dengan sistem (tidak ada selisih).
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowConfirmPost(false)} disabled={postMut.isPending}>Batal</Button>
              <Button size="sm" onClick={() => {
                postMut.mutate(opname.id, {
                  onSuccess: () => { setShowConfirmPost(false); onClose(); },
                });
              }} disabled={postMut.isPending}>
                {postMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Ya, Posting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Cancel */}
      {showConfirmCancel && opname && (
        <Dialog open onOpenChange={(o) => { if (!o) setShowConfirmCancel(false); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" /> Batalkan Opname
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm py-2">
              Opname <strong>{opname.opnameNo}</strong> akan dibatalkan. Data yang sudah diinput akan tetap tersimpan
              tetapi opname tidak dapat diproses lebih lanjut.
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowConfirmCancel(false)} disabled={cancelMut.isPending}>Batal</Button>
              <Button variant="destructive" size="sm" onClick={() => {
                cancelMut.mutate(opname.id, {
                  onSuccess: () => { setShowConfirmCancel(false); onClose(); },
                });
              }} disabled={cancelMut.isPending}>
                {cancelMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Ya, Batalkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

// ── Periode Tab ───────────────────────────────────────────────────────────────

function ConfirmDialog({ open, action, period, isPending, onConfirm, onCancel }: {
  open: boolean; action: "close" | "reopen"; period: { year: number; month: number } | null;
  isPending: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!period) return null;
  const label   = monthLabel(period.year, period.month);
  const isClose = action === "close";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isClose ? <Lock className="h-5 w-5 text-destructive" /> : <Unlock className="h-5 w-5 text-amber-600" />}
            {isClose ? "Tutup Periode" : "Buka Kembali Periode"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {isClose ? (
            <>
              <p className="text-sm">Anda akan menutup periode <strong>{label}</strong>. Semua mutasi stok bulan ini akan dikunci.</p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Setelah ditutup, tidak ada mutasi stok baru yang bisa dibuat untuk bulan ini.
                  Hanya SUPER_ADMIN yang bisa membuka kembali.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm">
              Anda akan membuka kembali periode <strong>{label}</strong>. Semua mutasi stok yang terkunci akan di-unlock.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Batal</Button>
          <Button size="sm" variant={isClose ? "destructive" : "default"} onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isClose ? "Tutup Periode" : "Buka Kembali"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodeTab() {
  const { data: dbPeriods = [], isLoading, isError, refetch } = useInventoryPeriods();
  const closeMut  = useClosePeriod();
  const reopenMut = useReopenPeriod();

  const [confirm, setConfirm] = useState<{ action: "close" | "reopen"; year: number; month: number } | null>(null);

  const periodMap = new Map<string, InventoryPeriod>(dbPeriods.map((p) => [`${p.year}-${p.month}`, p]));
  const months    = lastNMonths(12);

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.action === "close") {
      await closeMut.mutateAsync({ year: confirm.year, month: confirm.month });
    } else {
      await reopenMut.mutateAsync({ year: confirm.year, month: confirm.month });
    }
    setConfirm(null);
  };

  const isPending = closeMut.isPending || reopenMut.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Periode Terbuka",
            value: months.filter((m) => { const p = periodMap.get(`${m.year}-${m.month}`); return !p || p.status === "OPEN"; }).length,
            color: "text-emerald-600",
          },
          {
            label: "Periode Tertutup",
            value: months.filter((m) => { const p = periodMap.get(`${m.year}-${m.month}`); return p?.status === "CLOSED"; }).length,
            color: "text-red-500",
          },
          { label: "Total Ditampilkan", value: months.length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold leading-tight mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" /> Daftar Periode (12 Bulan Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-destructive">Gagal memuat data periode</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>Coba lagi</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Periode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ditutup Pada</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {months.map(({ year, month }) => {
                    const key     = `${year}-${month}`;
                    const period  = periodMap.get(key);
                    const status  = period?.status ?? "OPEN";
                    const isCurrent = year === new Date().getFullYear() && month === new Date().getMonth() + 1;

                    return (
                      <tr key={key} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium">{monthLabel(year, month)}</span>
                          {isCurrent && <span className="ml-2 text-xs text-primary font-medium">• Bulan ini</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={status === "OPEN" ? "default" : "destructive"}
                            className={status === "OPEN" ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : ""}
                          >
                            {status === "OPEN"
                              ? <><Unlock className="h-3 w-3 mr-1 inline" />Terbuka</>
                              : <><Lock className="h-3 w-3 mr-1 inline" />Tertutup</>}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {period?.closedAt
                            ? new Date(period.closedAt).toLocaleString("id-ID", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status === "OPEN" ? (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1.5 h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                              onClick={() => setConfirm({ action: "close", year, month })}
                              disabled={isPending}
                            >
                              <Lock className="h-3 w-3" /> Tutup
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1.5 h-7 text-xs"
                              onClick={() => setConfirm({ action: "reopen", year, month })}
                              disabled={isPending}
                            >
                              <Unlock className="h-3 w-3" /> Buka Kembali
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-start gap-2">
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 rotate-180" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p><strong>Periode Terbuka</strong> — mutasi stok (pembelian, penyesuaian, transfer) bisa dibuat.</p>
          <p><strong>Periode Tertutup</strong> — semua mutasi bulan tersebut dikunci. Tidak ada transaksi baru.</p>
          <p>Hanya <strong>SUPER_ADMIN</strong> yang bisa menutup dan membuka kembali periode.</p>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        action={confirm?.action ?? "close"}
        period={confirm}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
