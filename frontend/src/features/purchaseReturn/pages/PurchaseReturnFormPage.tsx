import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { ArrowLeft, Trash2, Loader2, Search, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePurchaseReturn } from "../hooks";
import { fetchPurchaseInvoice } from "@/features/purchase/api";
import { usePurchaseInvoices } from "@/features/purchase/hooks";
import { fetchReturnableQty } from "../api";
import type { PurchaseInvoice, PurchaseItem } from "@/features/purchase/types";
import { WIB_TZ, toWibDateStr } from "@/lib/utils";

interface FormItem {
  itemId:   string;
  unitId:   string;
  itemName: string;
  unitName: string;
  qty:      number;
  maxQty:   number;   // sisa yang masih bisa diretur (qty faktur − retur POSTED sebelumnya)
  price:    number;
  discount: number;
  subtotal: number;
  notes:    string;
}

interface FormValues {
  purchaseInvoiceId: string;
  returnDate:        string;
  notes:             string;
  items:             FormItem[];
}

const fmt = (v: number) => `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;

// Subtotal baris = qty × harga − diskon% (sama dengan backend, G4-18)
const lineTotal = (qty: number, price: number, discount: number) => {
  const gross = (Number(qty) || 0) * (Number(price) || 0);
  return gross - gross * ((Number(discount) || 0) / 100);
};

export function PurchaseReturnFormPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const createMutation = useCreatePurchaseReturn();

  const [invoiceSearch,   setInvoiceSearch]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showPicker,      setShowPicker]      = useState(false);
  const [loadingInvoice,  setLoadingInvoice]   = useState(false);
  const submittingRef = useRef(false);
  const [invoice,         setInvoice]          = useState<PurchaseInvoice | null>(null);
  const [invoiceError,    setInvoiceError]     = useState<string | null>(null);

  const { register, control, watch, setValue, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      purchaseInvoiceId: searchParams.get("invoiceId") ?? "",
      returnDate:        toWibDateStr(),
      notes:             "",
      items:             [],
    },
  });

  const { fields, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const grandTotal = watchedItems.reduce((sum, item) => sum + lineTotal(item.qty, item.price, item.discount), 0);

  // Pilih faktur dari daftar faktur POSTED yang bisa dicari (bukan ketik UUID)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(invoiceSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [invoiceSearch]);
  const { data: invoiceList, isFetching: searchingInvoices } = usePurchaseInvoices({
    status: "POSTED", search: debouncedSearch || undefined, limit: 10, page: 1,
  });
  const invoiceOptions = invoiceList?.data ?? [];

  // Load invoice when user types ID or clicks load
  const loadInvoice = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoadingInvoice(true);
    setInvoiceError(null);
    try {
      const inv = await fetchPurchaseInvoice(id.trim());
      if (inv.status !== "POSTED") {
        setInvoiceError(`Faktur ${inv.invoiceNo} bukan POSTED (status: ${inv.status})`);
        setInvoice(null);
        return;
      }
      // Batas qty = sisa yang masih bisa diretur, bukan qty faktur
      const returnable = await fetchReturnableQty(inv.id);
      const remainingById = new Map(returnable.map((r) => [r.purchaseInvoiceItemId, Number(r.remainingQty)]));
      const lines = inv.items
        .map((item: PurchaseItem) => ({ item, remaining: remainingById.get(item.id) ?? Number(item.qty) }))
        .filter(({ remaining }) => remaining > 0);
      if (lines.length === 0) {
        setInvoiceError(`Semua barang di faktur ${inv.invoiceNo} sudah diretur`);
        setInvoice(null);
        return;
      }
      setInvoice(inv);
      setValue("purchaseInvoiceId", inv.id);
      // Pre-fill items from invoice
      reset({
        purchaseInvoiceId: inv.id,
        returnDate:        toWibDateStr(),
        notes:             "",
        items: lines.map(({ item, remaining }) => ({
          itemId:   item.itemId,
          unitId:   item.unitId,
          itemName: item.item.name,
          unitName: item.unit.name,
          qty:      remaining,
          maxQty:   remaining,
          price:    Number(item.price),
          discount: Number(item.discount ?? 0),
          subtotal: lineTotal(remaining, Number(item.price), Number(item.discount ?? 0)),
          notes:    "",
        })),
      });
    } catch {
      setInvoiceError("Faktur pembelian tidak ditemukan");
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  }, [reset, setValue]);

  // Dibuka dari tombol "Buat Retur" di detail faktur → langsung muat fakturnya
  const initialInvoiceId = searchParams.get("invoiceId");
  useEffect(() => {
    if (initialInvoiceId) void loadInvoice(initialInvoiceId);
  }, [initialInvoiceId, loadInvoice]);

  const onSubmit = async (values: FormValues) => {
    // Cegah klik ganda membuat dua retur
    if (submittingRef.current) return;
    submittingRef.current = true;
    const items = values.items.map((item) => ({
      itemId:   item.itemId,
      unitId:   item.unitId,
      qty:      Number(item.qty),
      price:    Number(item.price),
      discount: Number(item.discount ?? 0) || undefined,
      subtotal: lineTotal(item.qty, item.price, item.discount),
      notes:    item.notes || undefined,
    }));

    try {
      const ret = await createMutation.mutateAsync({
        purchaseInvoiceId: values.purchaseInvoiceId,
        returnDate:        values.returnDate,
        notes:             values.notes || undefined,
        items,
      });
      navigate(`/purchase-returns/${ret.id}`);
    } catch {
      // error sudah ditangani oleh onError di hook (toast)
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Retur Pembelian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buat retur dari faktur pembelian yang sudah POSTED</p>
        </div>
      </div>

      {/* noValidate: pesan validasi dari react-hook-form (Bahasa Indonesia), bukan bubble browser */}
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Step 1: Load Invoice */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Pilih Faktur Pembelian</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Label htmlFor="invoiceSearch">Faktur Pembelian (POSTED)</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="invoiceSearch"
                  value={invoiceSearch}
                  onChange={(e) => { setInvoiceSearch(e.target.value); setShowPicker(true); }}
                  onFocus={() => setShowPicker(true)}
                  onBlur={() => setTimeout(() => setShowPicker(false), 150)}
                  placeholder="Cari no. faktur, no. faktur supplier, atau nama supplier..."
                  className="pl-8"
                  autoComplete="off"
                />
                {(loadingInvoice || searchingInvoices) && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {showPicker && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                  {invoiceOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      {searchingInvoices ? "Mencari..." : "Faktur POSTED tidak ditemukan"}
                    </p>
                  ) : invoiceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onMouseDown={() => { setShowPicker(false); setInvoiceSearch(""); void loadInvoice(opt.id); }}
                      className="w-full border-b border-border/40 px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                    >
                      <span className="font-mono font-medium">{opt.invoiceNo}</span>
                      <span className="ml-2 text-muted-foreground">{opt.supplier?.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(opt.invoiceDate).toLocaleDateString("id-ID", { timeZone: WIB_TZ })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {invoiceError && <p className="text-sm text-destructive">{invoiceError}</p>}
            {invoice && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">No. Invoice:</span>
                  <span className="font-mono font-semibold">{invoice.invoiceNo}</span>
                  <button
                    type="button"
                    onClick={() => { setInvoice(null); reset({ purchaseInvoiceId: "", returnDate: toWibDateStr(), notes: "", items: [] }); }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    title="Ganti faktur"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span>{new Date(invoice.invoiceDate).toLocaleDateString("id-ID", { timeZone: WIB_TZ })}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span>{invoice.supplier.name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Header */}
        {invoice && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">2. Detail Retur</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="returnDate">Tanggal Retur *</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    min={toWibDateStr(new Date(invoice.invoiceDate))}
                    {...register("returnDate", {
                      required: "Tanggal retur wajib diisi",
                      validate: (v) => v >= toWibDateStr(new Date(invoice.invoiceDate)) || "Tanggal retur tidak boleh sebelum tanggal faktur",
                    })}
                  />
                  {errors.returnDate && <p className="mt-1 text-xs text-destructive">{errors.returnDate.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Alasan retur..." rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Items */}
        {invoice && fields.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">3. Item yang Diretur</CardTitle>
                <p className="text-xs text-muted-foreground">Edit qty/harga sesuai kebutuhan retur</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium">Barang</th>
                      <th className="text-left px-3 py-2 font-medium">Satuan</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Harga</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Diskon %</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => {
                      const qty   = watchedItems[idx]?.qty   ?? 0;
                      const price = watchedItems[idx]?.price ?? 0;
                      const sub   = lineTotal(qty, price, watchedItems[idx]?.discount ?? 0);
                      const rowErr = errors.items?.[idx];
                      return (
                        <tr key={field.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{field.itemName}</div>
                            <input type="hidden" {...register(`items.${idx}.itemId`)} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {field.unitName}
                            <input type="hidden" {...register(`items.${idx}.unitId`)} />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${idx}.qty`, {
                                valueAsNumber: true,
                                validate: (v) => {
                                  if (!Number.isFinite(v) || v <= 0) return "Qty harus lebih dari 0";
                                  if (v > field.maxQty) return `Maks. ${field.maxQty.toLocaleString("id-ID")} (sisa yang bisa diretur)`;
                                  return true;
                                },
                              })}
                              aria-invalid={!!rowErr?.qty}
                              className={`text-right h-8 w-20 ml-auto ${rowErr?.qty ? "border-destructive" : ""}`}
                            />
                            {rowErr?.qty && <p className="mt-1 text-right text-xs text-destructive">{rowErr.qty.message}</p>}
                          </td>
                          <td className="px-3 py-2">
                            <Controller
                              control={control}
                              name={`items.${idx}.price`}
                              rules={{ validate: (v) => (Number.isFinite(v) && v >= 0) || "Harga tidak boleh minus" }}
                              render={({ field }) => (
                                <CurrencyInput
                                  {...field}
                                  prefix={false}
                                  value={field.value as number}
                                  aria-invalid={!!rowErr?.price}
                                  className={`text-right h-8 ${rowErr?.price ? "border-destructive" : ""}`}
                                />
                              )}
                            />
                            {rowErr?.price && <p className="mt-1 text-right text-xs text-destructive">{rowErr.price.message}</p>}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              {...register(`items.${idx}.discount`, {
                                valueAsNumber: true,
                                validate: (v) => (Number.isNaN(v) || (v >= 0 && v <= 100)) || "Diskon 0–100%",
                              })}
                              aria-invalid={!!rowErr?.discount}
                              className={`text-right h-8 w-20 ml-auto ${rowErr?.discount ? "border-destructive" : ""}`}
                            />
                            {rowErr?.discount && <p className="mt-1 text-right text-xs text-destructive">{rowErr.discount.message}</p>}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{fmt(sub)}</td>
                          <td className="px-3 py-2">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="px-3 py-3 text-right font-semibold">Total Retur</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-primary">{fmt(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {invoice && (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
            <Button type="submit" disabled={createMutation.isPending || fields.length === 0} className="gap-1.5">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat Retur
            </Button>
          </div>
        )}
      </form>
    </PageContainer>
  );
}
