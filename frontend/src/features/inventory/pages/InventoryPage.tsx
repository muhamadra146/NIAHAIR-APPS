import { useState } from "react";
import { ArrowDown, ArrowUp, Package, Search, Pencil, Check, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { fetchMasterItems, updateItemCommission, fetchCommissionCategories } from "@/features/commission/api";
import { fetchWarehouses } from "@/features/settings/api/warehouse.api";
import { fetchInvoiceItems } from "@/features/invoice/api";
import type { MasterItem } from "@/features/commission/types";
import type { StockTransfer, CreateTransferInput } from "../types";
import { ArrowLeftRight, Plus, Trash2, TruckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TABS = [
  { key: "stock",     label: "Stok" },
  { key: "movements", label: "Mutasi" },
  { key: "items",     label: "Master Item" },
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
        {activeTab === "items"     && <MasterItemTab />}
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

  const { data, isLoading } = useInventories({ page, limit: 30, branchId: branchId ?? undefined });
  const inventories = data?.data ?? [];
  const meta        = data?.meta;
  const totalPages  = meta ? Math.ceil(meta.total / 30) : 1;

  const filtered = debouncedSearch
    ? inventories.filter((i) =>
        i.item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (i.item.itemCode ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : inventories;

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
        ) : filtered.length === 0 ? (
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
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tersedia</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Minimum</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Update Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const available = Number(inv.availableQty);
                    const minimum   = Number(inv.minimumQty);
                    const low       = minimum > 0 && available <= minimum;
                    return (
                      <tr key={inv.id} className="border-b border-border transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{inv.item.name}</p>
                          {inv.item.itemCode && <p className="text-xs text-muted-foreground">{inv.item.itemCode}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.warehouse.name}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${low ? "text-red-600" : "text-foreground"}`}>
                            {available.toLocaleString("id-ID")}
                          </span>
                          {low && <Badge variant="outline" className="ml-2 text-xs text-red-600 border-red-300">Stok Rendah</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{minimum > 0 ? minimum.toLocaleString("id-ID") : "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((inv) => {
                const available = Number(inv.availableQty);
                const minimum   = Number(inv.minimumQty);
                const low       = minimum > 0 && available <= minimum;
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
                      <p className={`text-sm font-semibold ${low ? "text-red-600" : ""}`}>{available.toLocaleString("id-ID")}</p>
                      {low && <p className="text-xs text-red-500">Stok Rendah</p>}
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

// ── Master Item tab ───────────────────────────────────────────────────────────

function MasterItemTab() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((handleSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (handleSearch as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => {
      setDSearch(e.target.value); setPage(1);
    }, 300);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["master-items", page, dSearch],
    queryFn:  () => fetchMasterItems({ page, limit: 30, search: dSearch || undefined, isActive: true }),
    staleTime: 30_000,
  });

  const { data: catData } = useQuery({
    queryKey: ["commission-categories"],
    queryFn:  () => fetchCommissionCategories({ limit: 100 }),
    staleTime: 60_000,
  });
  const categories = catData?.data ?? [];

  const items      = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 30) : 1;

  const updateMut = useMutation({
    mutationFn: (item: MasterItem) =>
      updateItemCommission(item.id, { commissionCategoryId: selectedCatId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-items"] });
      setEditId(null);
      toast.success("Kategori komisi berhasil diset");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function startEdit(item: MasterItem) {
    setEditId(item.id);
    setSelectedCatId(item.commissionCategoryId ?? "");
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">Set kategori komisi untuk setiap item</p>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={handleSearch} placeholder="Cari item..." className="pl-8 h-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada item.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategori Komisi</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.itemCode}</td>
                    <td className="px-4 py-2.5 font-medium">{item.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={item.itemType === "SERVICE" ? "default" : "secondary"} className="text-[10px]">
                        {item.itemType === "SERVICE" ? "Layanan" : "Produk"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {editId === item.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedCatId}
                            onChange={(e) => setSelectedCatId(e.target.value)}
                            className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
                            autoFocus
                          >
                            <option value="">— Tidak ada —</option>
                            {categories.filter((c) => c.isActive).map((c) => (
                              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                          </select>
                          <Button size="sm" className="h-7 px-2" disabled={updateMut.isPending}
                            onClick={() => updateMut.mutate(item)}>
                            {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className={item.commissionCategoryId ? "text-sm" : "text-xs text-muted-foreground italic"}>
                          {item.commissionCategory?.name ?? "Belum diset"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {editId !== item.id && (
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function MovementsTab({ branchId }: { branchId?: string | null }) {
  const [page, setPage]       = useState(1);
  const [type, setType]       = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd]     = useState("");

  const { data, isLoading } = useStockMovements({
    page, limit: 30,
    type:     type || undefined,
    branchId: branchId ?? undefined,
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
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.item.name}</p>
                        {m.item.itemCode && <p className="text-xs text-muted-foreground">{m.item.itemCode}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.warehouse.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs gap-1 ${m.type === "IN" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                          {m.type === "IN"
                            ? <ArrowDown className="h-3 w-3" />
                            : <ArrowUp className="h-3 w-3" />}
                          {m.type === "IN" ? "Masuk" : "Keluar"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{Number(m.qty).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.balanceBefore).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(m.balanceAfter).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">{m.referenceType} …{m.referenceId.slice(-8).toUpperCase()}</span>
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {movements.map((m) => (
                <div key={m.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{m.item.name}</p>
                      <p className="text-xs text-muted-foreground">{m.warehouse.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`text-xs gap-1 ${m.type === "IN" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                        {m.type === "IN"
                          ? <ArrowDown className="h-3 w-3" />
                          : <ArrowUp className="h-3 w-3" />}
                        {Number(m.qty).toLocaleString("id-ID")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{m.referenceType} …{m.referenceId.slice(-8).toUpperCase()}</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              ))}
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

  function handleAction(id: string, status: string) {
    updateStatusMut.mutate({ id, status }, {
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
                      const s = STATUS_LABELS[t.status];
                      return (
                        <tr key={t.id} className="border-b border-border transition-colors hover:bg-muted/30">
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
                          <td className="px-4 py-3 text-right">
                            {t.status === "PENDING" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                disabled={updateStatusMut.isPending}
                                onClick={() => handleAction(t.id, "IN_TRANSIT")}>
                                <TruckIcon className="h-3 w-3" /> Kirim
                              </Button>
                            )}
                            {t.status === "IN_TRANSIT" && (
                              <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                disabled={updateStatusMut.isPending}
                                onClick={() => handleAction(t.id, "RECEIVED")}>
                                <Check className="h-3 w-3" /> Terima
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {transfers.map((t) => {
                  const s = STATUS_LABELS[t.status];
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-medium">{t.transferNo}</p>
                        <Badge variant="outline" className={`text-xs ${s?.className ?? ""}`}>{s?.label ?? t.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>{t.sourceWarehouse.name}</span>
                        <span className="mx-2">→</span>
                        <span>{t.destinationWarehouse.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatDate(t.transferDate)} · {t.items.length} item</span>
                        <div className="flex gap-1">
                          {t.status === "PENDING" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              disabled={updateStatusMut.isPending}
                              onClick={() => handleAction(t.id, "IN_TRANSIT")}>
                              <TruckIcon className="h-3 w-3" /> Kirim
                            </Button>
                          )}
                          {t.status === "IN_TRANSIT" && (
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

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Transfer Stok</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
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

          <div className="space-y-2">
            <Label className="text-sm">Item</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={itemSearch}
                onChange={(e) => handleItemSearchChange(e.target.value)}
                onFocus={() => { if (itemSearch.length >= 2) setShowItemDrop(true); }}
                onBlur={() => setTimeout(() => setShowItemDrop(false), 150)}
                placeholder="Cari item inventori..."
                className="pl-8 h-9"
              />
              {showItemDrop && itemResults && itemResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-10 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {itemResults
                    .filter((it) => it.itemType === "INVENTORY")
                    .map((it) => (
                      <button key={it.id} type="button" onMouseDown={() => selectItem(it)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                        <span className="font-medium">{it.name}</span>
                        {it.itemCode && <span className="text-xs text-muted-foreground ml-2">{it.itemCode}</span>}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border rounded-md divide-y text-sm">
                {lines.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 truncate">{line.itemName}</span>
                    <Input type="number" min={0.001} step={0.001} value={line.qty}
                      onChange={(e) => updateQty(line.itemId, parseFloat(e.target.value) || 0)}
                      className="h-7 w-24 text-right text-xs" />
                    <button type="button" onClick={() => removeLine(line.itemId)}
                      className="text-muted-foreground hover:text-destructive">
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
