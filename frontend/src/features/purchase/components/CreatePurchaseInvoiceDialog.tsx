import { useState, useCallback } from "react";
import { Search, Loader2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useQuery } from "@tanstack/react-query";
import { fetchWarehouses } from "@/features/settings/api/warehouse.api";
import { fetchInvoiceItems, type ItemSearchResult } from "@/features/invoice/api";
import { useSuppliers, useCreatePurchaseInvoice } from "../hooks";
import { fetchLastPurchasePrice } from "../api";
import type { CreatePurchaseItemInput } from "../types";

const fmt = (v: string | number) => `Rp ${Number(v).toLocaleString("id-ID")}`;

interface UnitOption  { unitId: string; unitName: string; }
interface PriceEntry  { unitId: string; sellingPrice: string; costPrice: string | null; }

interface LineItem extends CreatePurchaseItemInput {
  _key:           string;
  itemName:       string;
  itemCode:       string | null;
  unitName:       string;
  availableUnits: UnitOption[];
  itemPrices:     PriceEntry[];
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function CreatePurchaseInvoiceDialog({ open, onClose }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouseData }  = useQuery({
    queryKey: ["warehouses"],
    queryFn:  () => fetchWarehouses({}),
  });
  const warehouses = warehouseData?.data ?? [];
  const createMutation = useCreatePurchaseInvoice();

  const [supplierId,        setSupplier]   = useState("");
  const [supplierDiscount,  setSupplierDiscount] = useState<number>(0); // diskon default dari supplier
  const [warehouseId,       setWarehouse]  = useState("");
  const [invoiceDate,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [supplierInvoiceNo, setSupplierNo] = useState("");
  const [paymentTerms,      setPayTerms]   = useState("");
  const [notes,             setNotes]      = useState("");
  const [taxable,           setTaxable]    = useState(false);
  const [inclusiveTax,      setInclusive]  = useState(false);
  const [taxInvoiceDate,    setTaxDate]    = useState(""); // U2: default kosong, user pilih sendiri
  const [taxInvoiceNo,      setTaxNo]      = useState("");
  const [search,            setSearch]     = useState("");
  const [dSearch,           setDSearch]    = useState("");
  const [showDrop,          setShowDrop]   = useState(false);
  const [lines,             setLines]      = useState<LineItem[]>([]);

  function resetForm() {
    setSupplier(""); setSupplierDiscount(0); setWarehouse("");
    setDate(new Date().toISOString().slice(0, 10));
    setSupplierNo(""); setPayTerms(""); setNotes(""); setLines([]);
    setTaxable(false); setInclusive(false);
    setTaxDate(""); setTaxNo(""); // U2: reset ke kosong
  }

  // Auto-fill diskon default supplier ke semua line saat supplier berubah
  function handleSupplierChange(id: string) {
    setSupplier(id);
    const supplier = suppliers.find((s) => s.id === id);
    const disc = supplier?.purchaseDiscount != null ? Number(supplier.purchaseDiscount) : 0;
    setSupplierDiscount(disc);
    if (disc > 0 && lines.length > 0) {
      setLines((prev) => prev.map((l) => ({ ...l, discount: disc })));
    }
  }

  const debounce = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((debounce as unknown as { t?: ReturnType<typeof setTimeout> }).t);
    (debounce as unknown as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(() => setDSearch(val), 300);
    setShowDrop(val.length >= 1);
  }, []);

  const { data: searchData } = useQuery({
    queryKey: ["items-search", dSearch],
    queryFn:  () => fetchInvoiceItems(dSearch),
    enabled:  dSearch.length >= 1,
  });
  const searchItems = (searchData ?? []).filter((inv) => !lines.find((l) => l.itemId === inv.id));

  function getPriceForUnit(prices: PriceEntry[], unitId: string): number {
    const entry = prices.find((p) => p.unitId === unitId) ?? prices[0];
    if (!entry) return 0;
    const cost = Number(entry.costPrice);
    if (cost > 0) return cost;
    return Number(entry.sellingPrice) || 0;
  }

  async function selectItem(item: ItemSearchResult) {
    const defUnit =
      (item.purchaseUnitId ? item.itemUnits.find((u) => u.unit.id === item.purchaseUnitId) : null) ??
      item.itemUnits.find((u) => u.isDefault) ??
      item.itemUnits[0];
    if (!defUnit) { toast.error("Item belum punya satuan"); return; }
    const prices: PriceEntry[] = item.itemPrices.map((p) => ({
      unitId: p.unitId, sellingPrice: p.sellingPrice, costPrice: p.costPrice ?? null,
    }));
    let resolvedPrice = getPriceForUnit(prices, defUnit.unit.id);
    if (resolvedPrice === 0) {
      try {
        const last = await fetchLastPurchasePrice(item.id, defUnit.unit.id);
        if (last != null && last > 0) resolvedPrice = last;
      } catch { /* keep 0 */ }
    }
    setLines((prev) => [...prev, {
      _key: `${item.id}-${Date.now()}`,
      itemId: item.id, unitId: defUnit.unit.id, qty: 1, price: resolvedPrice,
      discount: supplierDiscount, // auto-fill diskon default supplier
      itemName: item.name, itemCode: item.itemCode, unitName: defUnit.unit.name,
      availableUnits: item.itemUnits.map((u) => ({ unitId: u.unit.id, unitName: u.unit.name })),
      itemPrices: prices,
    }]);
    setSearch(""); setDSearch(""); setShowDrop(false);
  }

  async function changeUnit(key: string, unitId: string, unitName: string) {
    const line = lines.find((l) => l._key === key);
    if (!line) return;
    let price = getPriceForUnit(line.itemPrices, unitId);
    if (price === 0) {
      try {
        const last = await fetchLastPurchasePrice(line.itemId, unitId);
        if (last != null && last > 0) price = last;
      } catch { /* keep 0 */ }
    }
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, unitId, unitName, price } : l));
  }

  function updateLine(key: string, field: keyof LineItem, val: string | number) {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, [field]: val } : l));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }

  const netBeforeTax = lines.reduce((sum, l) => {
    return sum + (Number(l.qty) || 0) * (Number(l.price) || 0) * (1 - (Number(l.discount) || 0) / 100);
  }, 0);
  const totalTax   = taxable && !inclusiveTax ? netBeforeTax * 0.11 : 0;
  const grandTotal = netBeforeTax + totalTax;

  function handleSubmit() {
    if (!supplierId)  return toast.error("Pilih pemasok");
    if (!warehouseId) return toast.error("Pilih gudang");
    if (!invoiceDate) return toast.error("Isi tanggal");
    if (lines.length === 0) return toast.error("Tambahkan minimal 1 item");
    const invalid = lines.find((l) => !l.qty || Number(l.qty) <= 0);
    if (invalid) return toast.error(`Qty tidak valid: ${invalid.itemName}`);

    createMutation.mutate(
      {
        supplierId, warehouseId, invoiceDate,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        paymentTerms:      paymentTerms      || undefined,
        taxable, inclusiveTax,
        taxInvoiceDate: taxable ? taxInvoiceDate : undefined,
        taxInvoiceNo:   taxable ? (taxInvoiceNo || undefined) : undefined,
        notes: notes || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId, unitId: l.unitId,
          qty: Number(l.qty), price: Number(l.price), discount: Number(l.discount) || 0,
        })),
      },
      { onSuccess: () => { onClose(); resetForm(); } }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetForm(); } }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Faktur Pembelian</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Pemasok <span className="text-destructive">*</span></Label>
              <select value={supplierId} onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Pilih pemasok —</option>
                {/* B5 fix: hanya tampilkan supplier aktif di dropdown */}
                {suppliers.filter((s) => s.isActive !== false).map((s) => (
                  <option key={s.id} value={s.id}>{s.code ? `[${s.code}] ` : ""}{s.name}{s.purchaseDiscount && Number(s.purchaseDiscount) > 0 ? ` (${Number(s.purchaseDiscount)}%)` : ""}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Gudang <span className="text-destructive">*</span></Label>
              <select value={warehouseId} onChange={(e) => setWarehouse(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Pilih gudang —</option>
                {warehouses.map((w: { id: string; name: string }) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Tanggal <span className="text-destructive">*</span></Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">No Faktur Supplier</Label>
              <Input value={supplierInvoiceNo} onChange={(e) => setSupplierNo(e.target.value)} placeholder="No. dari supplier..." className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Syarat Pembayaran</Label>
              <select value={paymentTerms} onChange={(e) => setPayTerms(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">— Pilih syarat —</option>
                <option value="C.O.D">C.O.D — Tunai saat pengantaran</option>
                <option value="net 7">net 7 — Jatuh Tempo 7 Hari</option>
                <option value="net 15">net 15 — Jatuh Tempo 15 Hari</option>
                <option value="net 30">net 30 — Jatuh Tempo 30 Hari</option>
                <option value="net 45">net 45 — Jatuh Tempo 45 Hari</option>
                <option value="net 60">net 60 — Jatuh Tempo 60 Hari</option>
                <option value="Set Manual">Set Manual — Atur sendiri</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm">Catatan</Label>
              {/* U3: textarea agar bisa multi-baris */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Keterangan tambahan..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Item search */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Rincian Barang</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input value={search} onChange={(e) => debounce(e.target.value)}
                onFocus={() => { if (search.length >= 1) setShowDrop(true); }}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                placeholder="Cari & tambah barang..." className="pl-8 h-9" />
            </div>
            {showDrop && searchItems.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden shadow-sm bg-background">
                {searchItems.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onMouseDown={() => selectItem(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b border-border/40 last:border-0 flex items-center justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.itemCode}</span>
                  </button>
                ))}
              </div>
            )}

            {lines.length > 0 && (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {lines.map((line) => {
                    const sub = (Number(line.qty) || 0) * (Number(line.price) || 0) * (1 - (Number(line.discount) || 0) / 100);
                    return (
                      <div key={line._key} className="border border-border rounded-md p-3 space-y-2 bg-muted/10">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm leading-tight">{line.itemName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {line.availableUnits.length > 1 ? (
                                <select value={line.unitId}
                                  onChange={(e) => { const u = line.availableUnits.find((x) => x.unitId === e.target.value); if (u) changeUnit(line._key, u.unitId, u.unitName); }}
                                  className="text-xs text-muted-foreground bg-background border border-border/60 rounded px-1 h-5 focus:outline-none">
                                  {line.availableUnits.map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName}</option>)}
                                </select>
                              ) : (
                                <span className="text-xs text-muted-foreground">{line.unitName}</span>
                              )}
                              {line.itemCode && <span className="text-xs text-muted-foreground">· {line.itemCode}</span>}
                            </div>
                          </div>
                          <button onClick={() => removeLine(line._key)} className="text-muted-foreground hover:text-destructive flex-shrink-0 mt-0.5">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Qty</p>
                            <Input type="number" min={1} step={1} value={line.qty}
                              onChange={(e) => updateLine(line._key, "qty", e.target.value)}
                              className="h-8 text-right font-mono text-xs px-2" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Harga</p>
                            <Input type="number" min={0} step={100} value={line.price}
                              onChange={(e) => updateLine(line._key, "price", e.target.value)}
                              className="h-8 text-right font-mono text-xs px-2" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Diskon %</p>
                            <Input type="number" min={0} max={100} step={0.01} value={line.discount}
                              onChange={(e) => updateLine(line._key, "discount", e.target.value)}
                              className="h-8 text-right font-mono text-xs px-2" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border/40">
                          <span className="text-xs text-muted-foreground">Subtotal</span>
                          <span className="font-mono font-semibold text-sm">{fmt(sub)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {taxable && !inclusiveTax && (
                    <div className="flex justify-between items-center px-1 pt-1 text-muted-foreground">
                      <span className="text-xs">PPN 11%</span>
                      <span className="font-mono text-xs">{fmt(totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-1 pt-1">
                    <span className="font-semibold text-sm">Grand Total</span>
                    <span className="font-mono font-bold text-sm">{fmt(grandTotal)}</span>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">Barang</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Qty</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">Harga</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-24">Diskon %</th>
                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-28">Subtotal</th>
                        <th className="px-2 py-2 w-7" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const sub = (Number(line.qty) || 0) * (Number(line.price) || 0) * (1 - (Number(line.discount) || 0) / 100);
                        return (
                          <tr key={line._key} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-2 py-2">
                              <p className="font-medium leading-tight text-xs">{line.itemName}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {line.availableUnits.length > 1 ? (
                                  <select value={line.unitId}
                                    onChange={(e) => { const u = line.availableUnits.find((x) => x.unitId === e.target.value); if (u) changeUnit(line._key, u.unitId, u.unitName); }}
                                    className="text-xs text-muted-foreground bg-transparent border border-border/60 rounded px-1 py-0 h-5 focus:outline-none focus:ring-1 focus:ring-ring">
                                    {line.availableUnits.map((u) => <option key={u.unitId} value={u.unitId}>{u.unitName}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{line.unitName}</span>
                                )}
                                {line.itemCode && <span className="text-xs text-muted-foreground">· {line.itemCode}</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={1} step={1} value={line.qty}
                                onChange={(e) => updateLine(line._key, "qty", e.target.value)}
                                className="h-7 text-right font-mono text-xs w-16 ml-auto px-1" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={0} step={100} value={line.price}
                                onChange={(e) => updateLine(line._key, "price", e.target.value)}
                                className="h-7 text-right font-mono text-xs w-24 ml-auto px-1" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min={0} max={100} step={0.01} value={line.discount}
                                onChange={(e) => updateLine(line._key, "discount", e.target.value)}
                                className="h-7 text-right font-mono text-xs w-20 ml-auto px-1" />
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-xs whitespace-nowrap">{fmt(sub)}</td>
                            <td className="px-2 py-2">
                              <button onClick={() => removeLine(line._key)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      {taxable && (
                        <tr className="border-t">
                          <td colSpan={4} className="px-2 py-1.5 text-right text-xs text-muted-foreground">Subtotal sebelum pajak</td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap">{fmt(netBeforeTax)}</td>
                          <td />
                        </tr>
                      )}
                      {taxable && !inclusiveTax && (
                        <tr>
                          <td colSpan={4} className="px-2 py-1.5 text-right text-xs text-muted-foreground">PPN 11%</td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap">{fmt(totalTax)}</td>
                          <td />
                        </tr>
                      )}
                      <tr className="border-t bg-muted/30">
                        <td colSpan={4} className="px-2 py-2 text-right text-sm font-semibold">Grand Total</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-sm whitespace-nowrap">{fmt(grandTotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Info Pajak */}
          <div className="border border-border rounded-md p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={taxable} onChange={(e) => setTaxable(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary" />
                <span className="text-sm font-medium">Kena Pajak (PPN 11%)</span>
              </label>
              {taxable && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={inclusiveTax} onChange={(e) => setInclusive(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary" />
                  <span className="text-sm">Total termasuk Pajak</span>
                </label>
              )}
            </div>
            {taxable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tgl Faktur Pajak</Label>
                  <Input type="date" value={taxInvoiceDate} onChange={(e) => setTaxDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">No. Faktur Pajak</Label>
                  <Input value={taxInvoiceNo} onChange={(e) => setTaxNo(e.target.value)}
                    placeholder="010.000-00.00000000" className="h-8 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-1.5">
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Buat Faktur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
