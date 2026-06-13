import { useState } from "react";
import { ArrowDown, ArrowUp, Package, Search } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useInventories, useStockMovements } from "../hooks";

const TABS = [
  { key: "stock",     label: "Stok" },
  { key: "movements", label: "Mutasi" },
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
