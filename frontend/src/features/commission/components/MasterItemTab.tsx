import { useState } from "react";
import { Search, Pencil, Check, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { fetchMasterItems, updateItemCommission, fetchCommissionCategories } from "../api";
import type { MasterItem } from "../types";

export function MasterItemTab() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [dSearch, setDSearch] = useState("");
  const [editId, setEditId]   = useState<string | null>(null);
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
