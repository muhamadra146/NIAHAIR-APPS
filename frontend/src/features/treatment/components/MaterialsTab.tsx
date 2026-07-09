import { useState, useEffect, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus, Trash2, Save, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchServiceMaterials, searchItems } from "../api";
import { useMaterialUsages, useBulkSaveMaterialUsages, useDeleteMaterialUsageItem } from "../hooks";
import type { TreatmentItem, MaterialUsageRow, BulkSaveMaterialUsageRow } from "../types";

// ─────────────────────────────────────────────────────────────────────────────

interface MaterialsTabProps {
  sessionId:      string;
  treatmentItems: TreatmentItem[];
  isCompleted:    boolean;
  onSaved?:       () => void;
}

export function MaterialsTab({
  sessionId,
  treatmentItems,
  isCompleted,
  onSaved,
}: MaterialsTabProps) {
  const [rows,       setRows]       = useState<MaterialUsageRow[]>([]);
  const [isDirty,    setIsDirty]    = useState(false);
  const [addOpen,    setAddOpen]    = useState(false);
  const [initDone,   setInitDone]   = useState(false);

  // Load BOM for every treatment item in parallel
  const bomResults = useQueries({
    queries: treatmentItems.map((ti) => ({
      queryKey:  ["service-materials", ti.itemId] as const,
      queryFn:   () => fetchServiceMaterials(ti.itemId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const { data: savedUsages = [], isLoading: usagesLoading } = useMaterialUsages(sessionId);
  const saveMutation   = useBulkSaveMaterialUsages(sessionId);
  const deleteMutation = useDeleteMaterialUsageItem(sessionId);

  const bomLoading = bomResults.some((r) => r.isLoading);

  // Build rows from BOM + saved data whenever both loads complete
  useEffect(() => {
    if (bomLoading || usagesLoading || initDone) return;

    const merged: MaterialUsageRow[] = [];

    // BOM rows (one group per treatment item)
    treatmentItems.forEach((ti, idx) => {
      const bom = bomResults[idx]?.data ?? [];
      bom.forEach((bomRow) => {
        const saved = savedUsages.find(
          (u) =>
            u.materialUsage.treatmentItemId === ti.id &&
            u.materialItem.id === bomRow.materialItemId,
        );
        merged.push({
          id:                  saved?.id ?? null,
          materialUsageId:     saved?.materialUsageId ?? null,
          treatmentItemId:     ti.id,
          materialItem:        bomRow.materialItem,
          unit:                bomRow.unit,
          plannedQty:          Number(bomRow.qty),
          actualQty:           saved ? Number(saved.qty) : Number(bomRow.qty),
          isFromBom:           true,
          inventoryMovementId: saved?.inventoryMovementId ?? null,
        });
      });
    });

    // Manual rows (exist in DB but not in any BOM)
    savedUsages.forEach((u) => {
      const alreadyInBom = merged.some(
        (r) =>
          r.treatmentItemId === u.materialUsage.treatmentItemId &&
          r.materialItem.id === u.materialItem.id,
      );
      if (!alreadyInBom) {
        merged.push({
          id:                  u.id,
          materialUsageId:     u.materialUsageId,
          treatmentItemId:     u.materialUsage.treatmentItemId,
          materialItem:        u.materialItem,
          unit:                u.unit,
          plannedQty:          null,
          actualQty:           Number(u.qty),
          isFromBom:           false,
          inventoryMovementId: u.inventoryMovementId,
        });
      }
    });

    setRows(merged);
    setInitDone(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomLoading, usagesLoading]);

  // Re-sync from server after a successful save (reset dirty + reinit)
  useEffect(() => {
    if (!initDone) return;
    setInitDone(false);
    setIsDirty(false);
    // initDone=false will re-trigger the merge useEffect above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedUsages]);

  function handleQtyChange(rowIdx: number, raw: string) {
    const val = parseFloat(raw);
    if (raw !== "" && (isNaN(val) || val < 0)) return;
    const qty = raw === "" ? 0 : val;
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, actualQty: qty } : r)),
    );
    setIsDirty(true);
  }

  async function handleSave() {
    if (treatmentItems.length === 0) return;

    const payload: BulkSaveMaterialUsageRow[] = rows
      .filter((r) => r.actualQty > 0 || r.isFromBom) // skip zero-qty ad-hoc rows
      .map((r) => ({
        id:              r.id,
        treatmentItemId: r.treatmentItemId,
        materialItemId:  r.materialItem.id,
        unitId:          r.unit.id,
        qty:             r.actualQty,
      }));

    await saveMutation.mutateAsync(payload);
    onSaved?.();
  }

  async function handleDelete(row: MaterialUsageRow, rowIdx: number) {
    if (row.isFromBom) return;
    if (row.id) {
      await deleteMutation.mutateAsync(row.id);
    } else {
      // Not yet saved — just remove from local state
      setRows((prev) => prev.filter((_, i) => i !== rowIdx));
      setIsDirty(true);
    }
  }

  function handleAddRow(newRow: MaterialUsageRow) {
    setRows((prev) => [...prev, newRow]);
    setIsDirty(true);
    setAddOpen(false);
  }

  const isLoading = bomLoading || usagesLoading;
  const hasTreatmentItems = treatmentItems.length > 0;
  const hasMovements = rows.some((r) => !!r.inventoryMovementId);

  const totalPlanned = rows.reduce((s, r) => s + (r.plannedQty ?? 0), 0);
  const totalActual  = rows.reduce((s, r) => s + r.actualQty, 0);

  if (!hasTreatmentItems) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Package className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Belum ada item treatment</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Tambahkan item treatment terlebih dahulu agar material usage bisa dicatat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Material Usage</p>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Memuat BOM…" : `${rows.length} material`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                disabled={isLoading}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Material
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || !isDirty || isLoading}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saveMutation.isPending ? "Menyimpan…" : "Simpan Material"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isDirty && !isCompleted && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Ada perubahan yang belum disimpan.
        </div>
      )}

      {hasMovements && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Inventory movement sudah digenerate — qty tidak dapat diubah.
        </div>
      )}

      {/* Skeleton */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Tidak ada BOM pada item treatment ini. Tambahkan material secara manual.
            </p>
            {!isCompleted && (
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Material
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Material</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Satuan</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Rencana</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty Aktual</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selisih</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const diff       = row.plannedQty !== null ? row.actualQty - row.plannedQty : null;
                      const canDelete  = !row.isFromBom && !row.inventoryMovementId && !isCompleted;
                      const qtyLocked  = !!row.inventoryMovementId || isCompleted;
                      return (
                        <tr
                          key={`${row.treatmentItemId}-${row.materialItem.id}-${idx}`}
                          className="border-b border-border transition-colors hover:bg-muted/20"
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{row.materialItem.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {row.materialItem.itemCode}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.unit.name}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                            {row.plannedQty !== null ? row.plannedQty : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {qtyLocked ? (
                              <span className="block text-right tabular-nums font-medium">
                                {row.actualQty}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={row.actualQty}
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                className="h-8 w-24 ml-auto text-right text-sm"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {diff !== null ? (
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  diff > 0  ? "text-amber-600" :
                                  diff < 0  ? "text-blue-600"  : "text-muted-foreground",
                                )}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {canDelete ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(row, idx)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : !row.isFromBom ? (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Mobile cards ── */}
          <div className="space-y-2 md:hidden">
            {rows.map((row, idx) => {
              const diff      = row.plannedQty !== null ? row.actualQty - row.plannedQty : null;
              const canDelete = !row.isFromBom && !row.inventoryMovementId && !isCompleted;
              const qtyLocked = !!row.inventoryMovementId || isCompleted;
              return (
                <Card
                  key={`${row.treatmentItemId}-${row.materialItem.id}-${idx}`}
                  className="overflow-hidden"
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{row.materialItem.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.materialItem.itemCode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!row.isFromBom && (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(row, idx)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Satuan</p>
                        <p className="font-medium">{row.unit.name}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Rencana</p>
                        <p className="font-medium tabular-nums">
                          {row.plannedQty !== null ? row.plannedQty : "—"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Aktual</p>
                        {qtyLocked ? (
                          <p className="font-medium tabular-nums">{row.actualQty}</p>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={row.actualQty}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="h-7 w-full text-sm px-2"
                          />
                        )}
                      </div>
                    </div>

                    {diff !== null && diff !== 0 && (
                      <p
                        className={cn(
                          "text-xs font-medium",
                          diff > 0 ? "text-amber-600" : "text-blue-600",
                        )}
                      >
                        Selisih: {diff > 0 ? `+${diff}` : diff} {row.unit.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Material</p>
                  <p className="text-xl font-bold">{rows.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Qty Rencana</p>
                  <p className="text-xl font-bold tabular-nums">{totalPlanned}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Qty Aktual</p>
                  <p className="text-xl font-bold tabular-nums">{totalActual}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <AddMaterialDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        treatmentItems={treatmentItems}
        onAdd={handleAddRow}
      />
    </div>
  );
}

// ── Add Material Dialog ───────────────────────────────────────────────────────

interface ItemOption {
  id:       string;
  name:     string;
  itemCode: string;
  itemType: string;
}

interface UnitOpt {
  id:   string;
  name: string;
}

function AddMaterialDialog({
  open,
  onOpenChange,
  treatmentItems,
  onAdd,
}: {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  treatmentItems: TreatmentItem[];
  onAdd:          (row: MaterialUsageRow) => void;
}) {
  const [search,        setSearch]        = useState("");
  const [results,       setResults]       = useState<ItemOption[]>([]);
  const [selected,      setSelected]      = useState<ItemOption | null>(null);
  const [units,         setUnits]         = useState<UnitOpt[]>([]);
  const [selectedUnit,  setSelectedUnit]  = useState<UnitOpt | null>(null);
  const [qty,           setQty]           = useState("1");
  const [selectedTiId,  setSelectedTiId]  = useState<string>(treatmentItems[0]?.id ?? "");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function reset() {
    setSearch(""); setResults([]); setSelected(null); setUnits([]);
    setSelectedUnit(null); setQty("1"); setError(null);
    setSelectedTiId(treatmentItems[0]?.id ?? "");
  }

  function handleOpenChange(v: boolean) { if (!v) reset(); onOpenChange(v); }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearch(q);
    setSelected(null);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchItems(q);
        setResults(res as unknown as ItemOption[]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  async function handleSelectItem(item: ItemOption) {
    setSelected(item);
    setResults([]);
    setSearch("");
    // Try to load units from item data (use search results)
    // For simplicity, create a default "unit" placeholder
    // The actual unit resolution happens via the BOM or user input
    setUnits([]);
    setSelectedUnit(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError("Pilih material terlebih dahulu"); return; }
    if (!selectedUnit) { setError("Pilih satuan terlebih dahulu"); return; }
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) { setError("Qty harus lebih dari 0"); return; }
    if (!selectedTiId) { setError("Pilih item treatment"); return; }

    onAdd({
      id:                  null,
      materialUsageId:     null,
      treatmentItemId:     selectedTiId,
      materialItem:        selected,
      unit:                selectedUnit,
      plannedQty:          null,
      actualQty:           qtyNum,
      isFromBom:           false,
      inventoryMovementId: null,
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          {treatmentItems.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label>Item Treatment *</Label>
              <select
                value={selectedTiId}
                onChange={(e) => setSelectedTiId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {treatmentItems.map((ti) => (
                  <option key={ti.id} value={ti.id}>
                    {ti.item?.name ?? ti.itemId}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Material *</Label>
            <Input
              value={selected ? selected.name : search}
              onChange={handleSearch}
              onClick={() => { if (selected) { setSelected(null); setSearch(""); } }}
              placeholder="Cari nama material…"
            />
            {!selected && results.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm max-h-48 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">{item.itemCode}</span>
                  </button>
                ))}
              </div>
            )}
            {loading && <p className="text-xs text-muted-foreground">Mencari…</p>}
          </div>

          {selected && (
            <div className="flex flex-col gap-1.5">
              <Label>Satuan *</Label>
              <Input
                placeholder="Masukkan nama satuan (mis: ml, gram, pcs)"
                value={selectedUnit?.name ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedUnit(v ? { id: `unit-temp-${v}`, name: v } : null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Satuan akan disesuaikan saat disimpan.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Qty *</Label>
            <Input
              type="number"
              min={0.001}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!selected}>
              Tambah
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
